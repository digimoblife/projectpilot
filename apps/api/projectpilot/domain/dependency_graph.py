import uuid
from collections import defaultdict
from typing import List, Set, Tuple


def will_create_circular_dependency(
    existing_dependencies: List[Tuple[uuid.UUID, uuid.UUID]],
    new_predecessor_id: uuid.UUID,
    new_successor_id: uuid.UUID,
) -> Tuple[bool, str]:
    # 1. Direct self-dependency
    if new_predecessor_id == new_successor_id:
        return True, "Cannot create self-referencing task dependency."

    # 2. Build adjacency list (Directed Graph: predecessor -> successors)
    graph = defaultdict(list)
    for pred, succ in existing_dependencies:
        graph[pred].append(succ)

    # Add the proposed edge
    graph[new_predecessor_id].append(new_successor_id)

    # 3. Check if new_predecessor is reachable starting from new_successor
    visited: Set[uuid.UUID] = set()

    def dfs(current: uuid.UUID) -> bool:
        if current == new_predecessor_id:
            return True  # Found cycle!
        visited.add(current)
        for neighbor in graph.get(current, []):
            if neighbor not in visited:
                if dfs(neighbor):
                    return True
        return False

    if dfs(new_successor_id):
        return (
            True,
            f"Circular dependency detected! Adding dependency from task '{new_predecessor_id}' to '{new_successor_id}' creates an invalid closed loop in the project timeline.",
        )

    return False, "Dependency is valid and acyclic."
