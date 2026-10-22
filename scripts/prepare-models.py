"""Create lightweight GLB assets from the supplied high resolution OBJ set.

Usage: python3 scripts/prepare-models.py --source /path/to/素材 \
       --output public/models --blender /Applications/Blender.app/Contents/MacOS/Blender
"""
import argparse
import os
from pathlib import Path
import subprocess
import tempfile

from PIL import Image


HERE = Path(__file__).resolve().parent
WORKER = HERE / "export-model.py"
ASSETS = {
    "red-conch": ("红色海螺", "6b329109376a467ee198d42f24057422.obj", 1.55, 0.16),
    "blue-conch": ("蓝色海螺", "021e6f0338c404711e29dff517399954.obj", 1.55, 0.16),
    "white-conch": ("白色海螺", "9acfd7be7e987f43f85ff70013400e09.obj", 1.55, 0.16),
    "table": ("三角桌子", "0daee085c0246407017defaf5ae17f29.obj", 9.0, 0.12),
    "plate": ("白盘子", "d5224956dd5e540ae400a8d5eb3f533d.obj", 1.85, 0.12),
}


def resized_image(source, destination, longest_edge, output_format, quality=None):
    with Image.open(source) as image:
        image = image.convert("RGB" if output_format == "JPEG" else "RGB")
        image.thumbnail((longest_edge, longest_edge), Image.Resampling.LANCZOS)
        options = {"optimize": True}
        if quality is not None:
            options["quality"] = quality
            options["progressive"] = True
        image.save(destination, format=output_format, **options)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--blender", type=Path, required=True)
    parser.add_argument("--only", choices=tuple(ASSETS))
    args = parser.parse_args()
    source_root = args.source.expanduser().resolve()
    output_root = args.output.expanduser().resolve()
    blender = args.blender.expanduser().resolve()
    output_root.mkdir(parents=True, exist_ok=True)
    selected = {args.only: ASSETS[args.only]} if args.only else ASSETS

    with tempfile.TemporaryDirectory(prefix="tidal-models-") as temp:
        temp_root = Path(temp)
        for slug, (folder, obj_file, width, ratio) in selected.items():
            asset_folder = source_root / folder
            obj_path = asset_folder / obj_file
            if not obj_path.is_file():
                raise FileNotFoundError(obj_path)
            maps_dir = temp_root / slug
            maps_dir.mkdir()
            diffuse = asset_folder / "texture_pbr_20250901.png"
            paths = {
                "base": maps_dir / "base.jpg",
                "roughness": maps_dir / "roughness.png",
                "metallic": maps_dir / "metallic.png",
                "normal": maps_dir / "normal.png",
            }
            resized_image(diffuse, paths["base"], 2048, "JPEG", 88)
            for kind in ("roughness", "metallic", "normal"):
                suffix = f"texture_pbr_20250901_{kind}.png"
                resized_image(asset_folder / suffix, paths[kind], 1024, "PNG")

            destination = output_root / f"{slug}.glb"
            command = [str(blender), "-b", "--python", str(WORKER), "--",
                       "--obj", str(obj_path), "--output", str(destination),
                       "--width", str(width), "--ratio", str(ratio)]
            for kind, path in paths.items():
                command.extend([f"--{kind}", str(path)])
            subprocess.run(command, check=True)
            print(f"READY {destination} ({destination.stat().st_size / 1024 / 1024:.1f} MB)", flush=True)


if __name__ == "__main__":
    main()
