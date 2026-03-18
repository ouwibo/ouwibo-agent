# ouwibo_agent/memory.py

MAX_MEMORY_MESSAGES = 40


class Memory:
    def __init__(self, max_messages: int = MAX_MEMORY_MESSAGES):
        self.history: list[dict] = []
        self.max_messages = max_messages

    def add(self, role: str, content: str) -> None:
        self.history.append({"role": role, "content": content})
        if len(self.history) > self.max_messages:
            self.history = self.history[-self.max_messages :]

    def get_history(self) -> list[dict]:
        return self.history

    def clear(self) -> None:
        self.history = []

    def __len__(self) -> int:
        return len(self.history)
