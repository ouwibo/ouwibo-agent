# main.py
import argparse
import logging
import os
import sys

from dotenv import load_dotenv
from openai import OpenAI  # type: ignore[import-untyped]

from core.agent import Agent
from core.config import DASHSCOPE_BASE_URL, get_env, EnvValidationError


def setup_logging(verbose: bool = False) -> None:
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s - %(levelname)s - %(name)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )


def validate_environment() -> None:
    """Validate required environment variables at startup."""
    try:
        get_env()
    except EnvValidationError as e:
        logging.error(f"Environment validation failed: {e}")
        sys.exit(1)


def build_client() -> OpenAI:
    api_key = os.getenv("DASHSCOPE_API_KEY")
    if not api_key:
        logging.error(
            "DASHSCOPE_API_KEY is not set. "
            "Please add it to your .env file or set it as an environment variable."
        )
        sys.exit(1)
    return OpenAI(api_key=api_key, base_url=DASHSCOPE_BASE_URL)


def run_single_task(agent: Agent, task: str) -> None:
    logging.info(f"Running task: {task!r}")
    result = agent.run(task)
    print(f"\n{'=' * 60}")
    print(f"Final Result:\n{result}")
    print(f"{'=' * 60}\n")


def run_interactive(agent: Agent) -> None:
    print("\nEntering interactive mode. Type 'exit' or 'quit' to close.")
    print("Type 'clear' to reset the session memory.\n")

    while True:
        try:
            task = input("Anda > ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\nExiting interactive mode.")
            break

        if not task:
            continue

        if task.lower() in {"exit", "quit"}:
            print("Goodbye!")
            break

        if task.lower() == "clear":
            agent.memory.clear()
            print("[Session memory reset.]\n")
            continue

        result = agent.run(task)
        print(f"\nAgent > {result}\n")


def main() -> None:
    load_dotenv()
    validate_environment()

    parser = argparse.ArgumentParser(
        description="Ouwibo Agent — AI agent.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Usage examples:\n"
            "  python main.py --task 'Who is the president of Indonesia?'\n"
            "  python main.py --interactive\n"
            "  python main.py --interactive --verbose\n"
        ),
    )
    parser.add_argument(
        "--task",
        type=str,
        help="The task to be executed by the agent (single-run mode).",
    )
    parser.add_argument(
        "--interactive",
        action="store_true",
        help="Run the agent in an interactive conversation session.",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable DEBUG level logging.",
    )
    args = parser.parse_args()

    setup_logging(verbose=args.verbose)

    if not args.task and not args.interactive:
        parser.print_help()
        sys.exit(0)

    client = build_client()
    agent = Agent(client)

    if args.interactive:
        run_interactive(agent)
    elif args.task:
        run_single_task(agent, args.task)


if __name__ == "__main__":
    main()
