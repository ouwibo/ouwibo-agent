# main.py
import argparse
import logging
import os
import sys

from dotenv import load_dotenv
from groq import Groq

from ouwibo_agent.agent import Agent


def setup_logging(verbose: bool = False) -> None:
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s - %(levelname)s - %(name)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )


def build_client() -> Groq:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        logging.error(
            "GROQ_API_KEY belum di-set. "
            "Tambahkan ke file .env atau set sebagai environment variable."
        )
        sys.exit(1)
    return Groq(api_key=api_key)


def run_single_task(agent: Agent, task: str) -> None:
    logging.info(f"Menjalankan task: {task!r}")
    result = agent.run(task)
    print(f"\n{'=' * 60}")
    print(f"Hasil Akhir:\n{result}")
    print(f"{'=' * 60}\n")


def run_interactive(agent: Agent) -> None:
    print("\nMasuk ke mode interaktif. Ketik 'exit' atau 'quit' untuk keluar.")
    print("Ketik 'clear' untuk mereset memori sesi.\n")

    while True:
        try:
            task = input("Anda > ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\nKeluar dari mode interaktif.")
            break

        if not task:
            continue

        if task.lower() in {"exit", "quit"}:
            print("Sampai jumpa!")
            break

        if task.lower() == "clear":
            agent.memory.clear()
            print("[Memori sesi direset.]\n")
            continue

        result = agent.run(task)
        print(f"\nAgent > {result}\n")


def main() -> None:
    load_dotenv()

    parser = argparse.ArgumentParser(
        description="Ouwibo Agent — AI agent berbasis Groq + LLaMA.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Contoh penggunaan:\n"
            "  python main.py --task 'Siapa presiden Indonesia?'\n"
            "  python main.py --interactive\n"
            "  python main.py --interactive --verbose\n"
        ),
    )
    parser.add_argument(
        "--task",
        type=str,
        help="Task yang akan dijalankan oleh agent (mode single-run).",
    )
    parser.add_argument(
        "--interactive",
        action="store_true",
        help="Jalankan dalam mode percakapan interaktif.",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Tampilkan log level DEBUG untuk debugging.",
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
