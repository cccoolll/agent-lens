"""
This script starts the Hypha server with specified command-line arguments and environment variables.
It loads environment variables from a .env file, parses command-line arguments, and constructs a command
to run the Hypha server with the specified options.
"""
import sys
import subprocess
import argparse
import os
from dotenv import load_dotenv

dotenv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'minio.env')
load_dotenv(dotenv_path)

def main():
    """
    Parse command-line arguments and start the Hypha server.
    """
    parser = argparse.ArgumentParser(description="Start the Hypha server")
    parser.add_argument("--host", type=str, default="0.0.0.0")
    parser.add_argument("--port", type=int, default=8080)
    parser.add_argument("--public-base-url", type=str, default="")
    args = parser.parse_args()

    command = [
        sys.executable,
        "-m",
        "hypha.server",
        f"--host={args.host}",
        f"--port={args.port}",
        f"--public-base-url={args.public_base_url}",
        "--enable-s3",
        f"--access-key-id={os.getenv('MINIO_ROOT_USER')}",
        f"--secret-access-key={os.getenv('MINIO_ROOT_PASSWORD')}",
        f"--endpoint-url={os.getenv('MINIO_SERVER_URL')}",
        f"--endpoint-url-public={os.getenv('MINIO_SERVER_URL')}",
        "--s3-admin-type=minio",
        "--startup-functions=agent_lens.start_services:setup"
    ]
    subprocess.run(command, check=True)
    
    print("Hypha server started. Access app at http://localhost:8080/public/apps/microscope-control")

if __name__ == "__main__":
    main()
