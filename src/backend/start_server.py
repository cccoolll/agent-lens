import sys
import subprocess
import argparse
import hypha_rpc

def main():
    parser = argparse.ArgumentParser(description="Start the Hypha server")
    parser.add_argument("--host", type=str, default="0.0.0.0")
    parser.add_argument("--port", type=int, default=9000)
    parser.add_argument("--public-base-url", type=str, default="")
    args = parser.parse_args()
    
    command = [
        sys.executable,
        "-m",
        "hypha.server",
        f"--host={args.host}",
        f"--port={args.port}",
        f"--public-base-url={args.public_base_url}",
        "--startup-functions=src.backend.main:setup"
    ]
    subprocess.run(command)
    
if __name__ == "__main__":
    main()