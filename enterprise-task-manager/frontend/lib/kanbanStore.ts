import { create } from "zustand";

import type { ApiBoard, ApiTask } from "./api";

export type Column = {
  id: number;
  name: string;
  taskIds: number[];
};

export type KanbanState = {
  boardOrder: number[];
  columns: Record<number, Column>;
  tasksById: Record<number, ApiTask>;
  setData: (boards: ApiBoard[], tasks: ApiTask[]) => void;
  moveTask: (
    taskId: number,
    sourceBoardId: number,
    destinationBoardId: number,
    destinationIndex: number
  ) => Snapshot;
  rollback: (snapshot: Snapshot) => void;
  applyRemoteTask: (task: ApiTask) => void;
};

export type Snapshot = {
  boardOrder: number[];
  columns: Record<number, Column>;
  tasksById: Record<number, ApiTask>;
};

const cloneSnapshot = (state: KanbanState): Snapshot => ({
  boardOrder: [...state.boardOrder],
  columns: Object.fromEntries(
    Object.entries(state.columns).map(([key, column]) => [
      key,
      { ...column, taskIds: [...column.taskIds] },
    ])
  ),
  tasksById: { ...state.tasksById },
});

const nameOrder = new Map([
  ["to do", 0],
  ["doing", 1],
  ["done", 2],
]);

const normalizeName = (name: string) => name.toLowerCase().replace(/\s+/g, " ").trim();

const sortBoards = (boards: ApiBoard[]) =>
  [...boards].sort((a, b) => {
    if (a.order !== b.order) {
      return a.order - b.order;
    }

    const aOrder = nameOrder.get(normalizeName(a.name)) ?? 999;
    const bOrder = nameOrder.get(normalizeName(b.name)) ?? 999;
    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }

    return a.id - b.id;
  });

const sortTasks = (tasks: ApiTask[]) =>
  [...tasks].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

export const useKanbanStore = create<KanbanState>((set, get) => ({
  boardOrder: [],
  columns: {},
  tasksById: {},
  setData: (boards, tasks) => {
    const sortedBoards = sortBoards(boards);
    const sortedTasks = sortTasks(tasks);
    const columns = Object.fromEntries(
      sortedBoards.map((board) => [
        board.id,
        { id: board.id, name: board.name, taskIds: [] },
      ])
    ) as Record<number, Column>;

    const tasksById: Record<number, ApiTask> = {};
    sortedTasks.forEach((task) => {
      tasksById[task.id] = task;
      if (columns[task.board]) {
        columns[task.board].taskIds.push(task.id);
      }
    });

    set({
      boardOrder: sortedBoards.map((board) => board.id),
      columns,
      tasksById,
    });
  },
  moveTask: (taskId, sourceBoardId, destinationBoardId, destinationIndex) => {
    const snapshot = cloneSnapshot(get());

    set((state) => {
      const sourceColumn = state.columns[sourceBoardId];
      const destinationColumn = state.columns[destinationBoardId];
      if (!sourceColumn || !destinationColumn) {
        return state;
      }

      const newSourceTaskIds = [...sourceColumn.taskIds];
      const sourceIndex = newSourceTaskIds.indexOf(taskId);
      if (sourceIndex !== -1) {
        newSourceTaskIds.splice(sourceIndex, 1);
      }

      const newDestinationTaskIds = [...destinationColumn.taskIds];
      newDestinationTaskIds.splice(destinationIndex, 0, taskId);

      return {
        columns: {
          ...state.columns,
          [sourceBoardId]: {
            ...sourceColumn,
            taskIds: newSourceTaskIds,
          },
          [destinationBoardId]: {
            ...destinationColumn,
            taskIds: newDestinationTaskIds,
          },
        },
        tasksById: {
          ...state.tasksById,
          [taskId]: {
            ...state.tasksById[taskId],
            board: destinationBoardId,
          },
        },
      };
    });

    return snapshot;
  },
  rollback: (snapshot) => {
    set({
      boardOrder: snapshot.boardOrder,
      columns: snapshot.columns,
      tasksById: snapshot.tasksById,
    });
  },
  applyRemoteTask: (task) => {
    set((state) => {
      const existing = state.tasksById[task.id];
      const nextTasksById = { ...state.tasksById, [task.id]: task };
      const columns = { ...state.columns };

      if (!columns[task.board]) {
        return state;
      }

      if (!existing) {
        columns[task.board] = {
          ...columns[task.board],
          taskIds: [...columns[task.board].taskIds, task.id],
        };
        return { tasksById: nextTasksById, columns };
      }

      if (existing.board === task.board) {
        return { tasksById: nextTasksById };
      }

      columns[existing.board] = {
        ...columns[existing.board],
        taskIds: columns[existing.board].taskIds.filter(
          (id) => id !== task.id
        ),
      };
      columns[task.board] = {
        ...columns[task.board],
        taskIds: [...columns[task.board].taskIds, task.id],
      };

      return { tasksById: nextTasksById, columns };
    });
  },
}));
