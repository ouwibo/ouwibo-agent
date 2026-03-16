{ pkgs, ... }: {
  # Which nixpkgs channel to use.
  channel = "stable-24.05"; # or "unstable"
  # Use https://search.nixos.org/packages to find packages
  packages = [
    pkgs.python311
    pkgs.python311Packages.pip
    pkgs.nodejs_20
  ];
  # Sets environment variables in the workspace
  env = {};
  idx = {
    # Search for the extensions you want on https://open-vsx.org/ and use "publisher.id"
    extensions = [
      "ritwickdey.LiveServer"
      "esbenp.prettier-vscode"
      "ms-python.python"
    ];
    # Enable previews and customize configuration
    previews = {
      enable = true;
      previews = {
        web = {
          command = ["./venv/bin/python" "-m" "uvicorn" "api:app" "--host" "0.0.0.0" "--port" "$PORT"];
          manager = "web";
        };
      };
    };
    # Workspace lifecycle hooks
    workspace = {
      # Runs when a workspace is first created with this `dev.nix` file
      onCreate = {
        python-install = "python -m venv venv && source venv/bin/activate && pip install -r requirements.txt";
      };
      # Runs when the workspace is (re)started
      onStart = {
        # Example: start a continuous build process
        # build-watch = "npm run build:watch";
      };
    };
  };
}
