"""Blender worker invoked by prepare-models.py; writes one optimized GLB."""
import bpy
import math
import os
import sys
from mathutils import Vector


def arg_after(name):
    args = sys.argv[sys.argv.index("--") + 1:]
    return args[args.index(name) + 1]


source = os.path.abspath(arg_after("--obj"))
destination = os.path.abspath(arg_after("--output"))
target_width = float(arg_after("--width"))
ratio = float(arg_after("--ratio"))
maps = {
    "base": os.path.abspath(arg_after("--base")),
    "roughness": os.path.abspath(arg_after("--roughness")),
    "metallic": os.path.abspath(arg_after("--metallic")),
    "normal": os.path.abspath(arg_after("--normal")),
}

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.wm.obj_import(filepath=source, forward_axis="NEGATIVE_Z", up_axis="Y")
objects = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
if not objects:
    raise RuntimeError("OBJ importer returned no meshes")
bpy.ops.object.select_all(action="DESELECT")
for obj in objects:
    obj.select_set(True)
bpy.context.view_layer.objects.active = objects[0]
if len(objects) > 1:
    bpy.ops.object.join()
obj = bpy.context.view_layer.objects.active

# Bake axis and object transforms into the geometry, then normalize it around
# the center of its foot print. GLTF uses a conventional Y-up scene in Three.js.
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
coords = [v.co.copy() for v in obj.data.vertices]
minimum = Vector(tuple(min(v[i] for v in coords) for i in range(3)))
maximum = Vector(tuple(max(v[i] for v in coords) for i in range(3)))
center_x = (minimum.x + maximum.x) * 0.5
center_z = (minimum.z + maximum.z) * 0.5
extent = max(maximum.x - minimum.x, maximum.y - minimum.y, maximum.z - minimum.z)
scale = target_width / extent
for vertex in obj.data.vertices:
    vertex.co = Vector(((vertex.co.x - center_x) * scale,
                        (vertex.co.y - minimum.y) * scale,
                        (vertex.co.z - center_z) * scale))
obj.data.update()

if ratio < 0.999:
    modifier = obj.modifiers.new("Optimized surface", "DECIMATE")
    modifier.decimate_type = "COLLAPSE"
    modifier.ratio = ratio
    modifier.use_collapse_triangulate = True
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=modifier.name)

material = bpy.data.materials.new("PBR surface")
material.use_nodes = True
material.diffuse_color = (0.8, 0.8, 0.8, 1)
obj.data.materials.clear()
obj.data.materials.append(material)
nodes = material.node_tree.nodes
links = material.node_tree.links
nodes.clear()
output = nodes.new("ShaderNodeOutputMaterial")
bsdf = nodes.new("ShaderNodeBsdfPrincipled")
links.new(bsdf.outputs["BSDF"], output.inputs["Surface"])

def image_node(key, color_space):
    image = bpy.data.images.load(maps[key], check_existing=False)
    image.colorspace_settings.name = color_space
    node = nodes.new("ShaderNodeTexImage")
    node.image = image
    socket = {"base": "Base Color", "roughness": "Roughness", "metallic": "Metallic"}.get(key)
    if socket:
        links.new(node.outputs["Color"], bsdf.inputs[socket])
    return node

image_node("base", "sRGB")
image_node("roughness", "Non-Color")
image_node("metallic", "Non-Color")
normal_tex = image_node("normal", "Non-Color")
normal = nodes.new("ShaderNodeNormalMap")
links.new(normal_tex.outputs["Color"], normal.inputs["Color"])
links.new(normal.outputs["Normal"], bsdf.inputs["Normal"])

for poly in obj.data.polygons:
    poly.use_smooth = True

bpy.ops.object.select_all(action="DESELECT")
obj.select_set(True)
bpy.context.view_layer.objects.active = obj
os.makedirs(os.path.dirname(destination), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=destination, export_format="GLB",
                           use_selection=True, export_apply=True,
                           export_image_format="AUTO", export_materials="EXPORT",
                           export_texcoords=True, export_normals=True,
                           export_draco_mesh_compression_enable=True,
                           export_draco_mesh_compression_level=6)
print("MODEL_RESULT", destination, "faces", len(obj.data.polygons),
      "scale", scale)
