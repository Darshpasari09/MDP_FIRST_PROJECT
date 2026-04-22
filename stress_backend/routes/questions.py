from fastapi import APIRouter
import random
import json
import os
from groq import Groq

router = APIRouter()

# ── Groq config ───────────────────────────────────────────────────────────────
# Set GROQ_API_KEY as an environment variable, OR paste your key directly below.
GROQ_API_KEY  = os.getenv("GROQ_API_KEY")
GROQ_MODEL    = "llama-3.1-8b-instant"   # fastest free Groq model
HISTORY_FILE  = os.path.join(os.path.dirname(__file__), "..", "question_history.json")
MAX_HISTORY   = 20


# ── Persistent history helpers ───────────────────────────────────────────────

def load_history() -> list:
    try:
        if os.path.exists(HISTORY_FILE):
            with open(HISTORY_FILE, "r") as f:
                return json.load(f)
    except Exception:
        pass
    return []


def save_history(history: list):
    try:
        with open(HISTORY_FILE, "w") as f:
            json.dump(history[-MAX_HISTORY:], f, indent=2)
    except Exception:
        pass


def is_duplicate(new_q: str, history: list) -> bool:
    """True if the question text is too similar to any in history."""
    new_q_lower = new_q.lower().strip()
    for past in history:
        # Simple overlap check: if 60%+ of words match, treat as duplicate
        past_words = set(past.lower().split())
        new_words  = set(new_q_lower.split())
        if len(past_words) == 0:
            continue
        overlap = len(past_words & new_words) / len(past_words)
        if overlap > 0.6:
            return True
    return False


# ── Topic pool ───────────────────────────────────────────────────────────────

DSA_TOPICS = {
    "easy": [
        "Arrays: insertion, deletion, and traversal",
        "Linked Lists: traversal and node access",
        "Stack push/pop and LIFO behavior",
        "Queue enqueue/dequeue and FIFO behavior",
        "Binary Search on sorted arrays",
        "Bubble Sort: swaps and passes",
        "Recursion: base cases and call stack",
        "Hash Tables: key-value lookup",
        "Selection Sort vs Insertion Sort differences",
        "Two-dimensional arrays and matrix access",
        "Singly vs Doubly Linked List differences",
        "Circular Queue behavior and wrap-around",
    ],
    "medium": [
        "BST insertion, deletion, and search",
        "BFS vs DFS: order and use-cases",
        "Memoization vs Tabulation in Dynamic Programming",
        "Merge Sort: divide step and merge step",
        "Min-Heap and Max-Heap: heapify and extract",
        "Two-pointer technique on sorted arrays",
        "Sliding window: fixed and variable size",
        "Trie: insert and prefix search",
        "Quick Sort: pivot selection and partitioning",
        "Graph representation: adjacency list vs matrix",
        "Hashing: collision resolution strategies",
        "Priority Queue operations and time complexity",
        "Kadane's algorithm for maximum subarray",
        "Floyd's cycle detection algorithm",
        "Binary search on answer (parametric search)",
    ],
    "hard": [
        "Dijkstra's algorithm: greedy choice and edge relaxation",
        "Bellman-Ford vs Floyd-Warshall: negative weights",
        "Segment Trees with lazy propagation",
        "AVL Tree rotations: LL, RR, LR, RL cases",
        "Topological Sort: Kahn's vs DFS approach",
        "0/1 Knapsack vs Unbounded Knapsack",
        "Red-Black Tree invariants and rebalancing",
        "Suffix Array construction and LCP array",
        "Fenwick Tree (BIT) point update and prefix query",
        "Johnson's algorithm for sparse graphs",
        "Strongly Connected Components: Tarjan's vs Kosaraju's",
        "Convex Hull: Graham scan vs Jarvis march",
        "Heavy-Light Decomposition on trees",
        "Matrix Chain Multiplication DP",
        "Longest Common Subsequence space optimization",
    ],
}


# ── LLM call (Groq) ──────────────────────────────────────────────────────────

def call_groq(difficulty: str, topic: str, history: list) -> str:
    avoid_block = ""
    if history:
        avoid_block = "Do NOT repeat: " + " | ".join(history[-3:]) + ". "

    system = (
        "You are a DSA professor. Output ONLY an MCQ in this exact format:\n"
        "Question: <text>\nA) <opt>\nB) <opt>\nC) <opt>\nD) <opt>\n"
        "Correct Answer: <A/B/C/D>\n"
        "No extra text, no explanations, no markdown."
    )
    user = f"Write ONE {difficulty}-level MCQ about: {topic}. {avoid_block}"

    client = Groq(api_key=GROQ_API_KEY)
    chat   = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user",   "content": user}
        ],
        max_tokens=220,
        temperature=0.85,
        timeout=10
    )
    return chat.choices[0].message.content.strip()


# ── Built-in question bank (instant fallback when Ollama is slow) ─────────────

QUESTION_BANK = {
    "easy": [
        "Question: What data structure follows Last In First Out (LIFO)?\nA) Queue\nB) Stack\nC) Array\nD) Linked List\nCorrect Answer: B",
        "Question: What is the time complexity of accessing an element in an array by index?\nA) O(n)\nB) O(log n)\nC) O(1)\nD) O(n²)\nCorrect Answer: C",
        "Question: Which traversal visits the root node first in a binary tree?\nA) Inorder\nB) Postorder\nC) Levelorder\nD) Preorder\nCorrect Answer: D",
        "Question: What does a Queue use as its insertion end?\nA) Front\nB) Rear\nC) Top\nD) Middle\nCorrect Answer: B",
        "Question: Which sorting algorithm has O(n²) worst-case and O(n) best-case?\nA) Merge Sort\nB) Heap Sort\nC) Bubble Sort\nD) Quick Sort\nCorrect Answer: C",
        "Question: In a singly linked list, each node contains data and a pointer to?\nA) Previous node\nB) First node\nC) Next node\nD) Last node\nCorrect Answer: C",
        "Question: What is recursion?\nA) A loop that runs forever\nB) A function that calls itself\nC) A type of array\nD) A sorting method\nCorrect Answer: B",
        "Question: What is the space complexity of storing n elements in an array?\nA) O(1)\nB) O(log n)\nC) O(n)\nD) O(n²)\nCorrect Answer: C",
        "Question: Binary search requires the input array to be?\nA) Reversed\nB) Sorted\nC) Random\nD) Circular\nCorrect Answer: B",
        "Question: Which data structure is used for BFS traversal of a graph?\nA) Stack\nB) Array\nC) Queue\nD) Heap\nCorrect Answer: C",
    ],
    "medium": [
        "Question: What is the worst-case time complexity of QuickSort?\nA) O(n log n)\nB) O(n)\nC) O(n²)\nD) O(log n)\nCorrect Answer: C",
        "Question: In a BST, where is the minimum value always found?\nA) Root\nB) Rightmost node\nC) Leftmost node\nD) Last level\nCorrect Answer: C",
        "Question: What does memoization primarily optimize?\nA) Space usage\nB) Redundant recursive calls\nC) Sorting speed\nD) Graph traversal\nCorrect Answer: B",
        "Question: Which graph algorithm uses a priority queue to find the shortest path?\nA) BFS\nB) DFS\nC) Dijkstra's\nD) Kruskal's\nCorrect Answer: C",
        "Question: What is the height of a balanced binary tree with n nodes?\nA) O(n)\nB) O(n²)\nC) O(log n)\nD) O(1)\nCorrect Answer: C",
        "Question: The sliding window technique is best suited for problems involving?\nA) Graphs\nB) Trees\nC) Contiguous subarrays or substrings\nD) Hash maps\nCorrect Answer: C",
        "Question: In a hash table, what happens when two keys hash to the same index?\nA) The table resizes\nB) Data is lost\nC) Collision occurs\nD) The key is ignored\nCorrect Answer: C",
        "Question: What is the time complexity of inserting into a max-heap?\nA) O(1)\nB) O(log n)\nC) O(n)\nD) O(n log n)\nCorrect Answer: B",
        "Question: Merge Sort is preferred over Quick Sort when?\nA) Memory is limited\nB) Stability is required and worst-case matters\nC) The array is nearly sorted\nD) In-place sorting is needed\nCorrect Answer: B",
        "Question: Which algorithm detects a cycle in a linked list?\nA) Boyer-Moore\nB) Floyd's Tortoise and Hare\nC) Kadane's\nD) KMP\nCorrect Answer: B",
    ],
    "hard": [
        "Question: What is the time complexity of Dijkstra's algorithm using a binary heap?\nA) O(V²)\nB) O(E log V)\nC) O(V log E)\nD) O(E + V)\nCorrect Answer: B",
        "Question: An AVL tree rebalances after insertion using rotations. Which case requires a Left-Right rotation?\nA) Left-Left imbalance\nB) Right-Right imbalance\nC) Left-Right imbalance\nD) Right-Left imbalance\nCorrect Answer: C",
        "Question: Which property distinguishes Bellman-Ford from Dijkstra's?\nA) Bellman-Ford is faster\nB) Bellman-Ford handles negative weight edges\nC) Dijkstra handles disconnected graphs\nD) Bellman-Ford only works on trees\nCorrect Answer: B",
        "Question: In a segment tree with lazy propagation, what is the time complexity for a range update?\nA) O(n)\nB) O(n log n)\nC) O(log n)\nD) O(1)\nCorrect Answer: C",
        "Question: Topological sort is only possible on which type of graph?\nA) Undirected cyclic graph\nB) Directed acyclic graph (DAG)\nC) Complete graph\nD) Bipartite graph\nCorrect Answer: B",
        "Question: What is the time complexity of the 0/1 Knapsack DP solution with n items and capacity W?\nA) O(n + W)\nB) O(n log W)\nC) O(n × W)\nD) O(W²)\nCorrect Answer: C",
        "Question: In a Fenwick Tree (BIT), what is the time complexity of a prefix sum query?\nA) O(n)\nB) O(1)\nC) O(log n)\nD) O(n log n)\nCorrect Answer: C",
        "Question: Tarjan's algorithm for Strongly Connected Components runs in?\nA) O(V²)\nB) O(V + E)\nC) O(E log V)\nD) O(V log V)\nCorrect Answer: B",
        "Question: What is the main advantage of a Red-Black Tree over an AVL Tree?\nA) Faster lookups\nB) Less memory usage\nC) Fewer rotations during insertions and deletions\nD) Better for range queries\nCorrect Answer: C",
        "Question: The Longest Common Subsequence of 'ABCBDAB' and 'BDCAB' has length?\nA) 3\nB) 4\nC) 5\nD) 6\nCorrect Answer: B",
    ]
}


# ── Route ─────────────────────────────────────────────────────────────────────

@router.get("/api/v1/next-question")
def next_question(stress: str):

    if stress == "high":
        difficulty = "easy"
    elif stress == "moderate":
        difficulty = "medium"
    else:
        difficulty = "hard"

    history      = load_history()
    chosen_topic = random.choice(DSA_TOPICS[difficulty])
    question_text = ""

    # Try Groq first (fast cloud AI) — fall back to bank if key missing or error
    if GROQ_API_KEY and GROQ_API_KEY != "PASTE_YOUR_KEY_HERE":
        try:
            raw = call_groq(difficulty, chosen_topic, history)

            q_line = ""
            for line in raw.splitlines():
                if line.strip().lower().startswith("question:"):
                    q_line = line.strip()
                    break

            if q_line and not is_duplicate(q_line, history):
                question_text = raw
                history.append(q_line)
                save_history(history)

        except Exception:
            question_text = ""

    # Instant fallback: pick unused question from built-in bank
    if not question_text:
        bank = QUESTION_BANK[difficulty]
        used = set(history)
        unused = [q for q in bank if not any(
            h.lower() in q.lower() for h in used
        )]
        chosen = random.choice(unused if unused else bank)
        question_text = chosen
        # Save first line of bank question to history
        history.append(chosen.splitlines()[0])
        save_history(history)

    return {
        "difficulty": difficulty,
        "topic": chosen_topic,
        "question": question_text
    }
