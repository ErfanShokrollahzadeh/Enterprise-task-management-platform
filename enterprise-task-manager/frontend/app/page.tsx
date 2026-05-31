"use client";

import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";
import { useEffect, useMemo, useState } from "react";

import {
  fetchBoards,
  fetchTasks,
  updateTaskBoard,
  type ApiTask,
} from "../lib/api";
import { useKanbanStore } from "../lib/kanbanStore";

const PROJECT_ID = 1;

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const boardOrder = useKanbanStore((state) => state.boardOrder);
  const columns = useKanbanStore((state) => state.columns);
  const tasksById = useKanbanStore((state) => state.tasksById);
  const setData = useKanbanStore((state) => state.setData);
  const moveTask = useKanbanStore((state) => state.moveTask);
  const rollback = useKanbanStore((state) => state.rollback);
  const applyRemoteTask = useKanbanStore((state) => state.applyRemoteTask);

  const tasksByBoard = useMemo(() => {
    return boardOrder.map((boardId) => {
      const column = columns[boardId];
      const tasks = (column?.taskIds ?? [])
        .map((id) => tasksById[id])
        .filter((task): task is ApiTask => Boolean(task));
      return { column, tasks };
    });
  }, [boardOrder, columns, tasksById]);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const [boards, tasks] = await Promise.all([fetchBoards(), fetchTasks()]);
        const projectBoards = boards.filter((board) => board.project === PROJECT_ID);
        const projectTasks = tasks.filter((task) => task.project === PROJECT_ID);
        if (isMounted) {
          setData(projectBoards, projectTasks);
        }
      } catch (error) {
        if (isMounted) {
          setToast("Failed to load boards and tasks.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [setData]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const socket = new WebSocket(
      `ws://localhost:8000/ws/projects/${PROJECT_ID}/`
    );

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as {
          type: string;
          task?: ApiTask;
        };
        if (payload.type === "task.updated" && payload.task) {
          applyRemoteTask(payload.task);
        }
      } catch {
        setToast("Received malformed WebSocket data.");
      }
    };

    socket.onerror = () => {
      setToast("WebSocket connection error.");
    };

    return () => {
      socket.close();
    };
  }, [applyRemoteTask]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) {
      return;
    }

    const sourceBoardId = Number(source.droppableId);
    const destinationBoardId = Number(destination.droppableId);
    if (
      sourceBoardId === destinationBoardId &&
      source.index === destination.index
    ) {
      return;
    }

    const taskId = Number(draggableId);
    const snapshot = moveTask(
      taskId,
      sourceBoardId,
      destinationBoardId,
      destination.index
    );

    try {
      await updateTaskBoard(taskId, destinationBoardId);
    } catch (error) {
      rollback(snapshot);
      setToast("Update failed. Your change was rolled back.");
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff7ed,#fef3c7,#f5f5f4)] text-zinc-900">
      <header className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 pt-10">
        <div className="inline-flex w-fit items-center rounded-full bg-zinc-900 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-amber-100">
          Phase 7 Kanban
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl">
              Enterprise Task Board
            </h1>
            <p className="max-w-2xl text-sm text-zinc-600 md:text-base">
              Drag cards across columns. Updates are optimistic and broadcast in
              real time to connected teammates.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-zinc-500">
            <span className="rounded-full bg-white/70 px-3 py-1 shadow-sm">
              Project {PROJECT_ID}
            </span>
            <span className="rounded-full bg-white/70 px-3 py-1 shadow-sm">
              WebSocket Ready
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 pb-16 pt-10">
        {isLoading ? (
          <div className="rounded-3xl bg-white/70 p-10 text-center text-sm text-zinc-500 shadow-lg">
            Loading board...
          </div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="grid gap-6 md:grid-cols-3">
              {tasksByBoard.map(({ column, tasks }) => {
                if (!column) {
                  return null;
                }
                return (
                  <Droppable
                    droppableId={String(column.id)}
                    key={column.id}
                  >
                    {(provided) => (
                      <section
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="rounded-3xl bg-white/80 p-4 shadow-lg backdrop-blur"
                      >
                        <div className="mb-4 flex items-center justify-between">
                          <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">
                            {column.name}
                          </h2>
                          <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs text-amber-100">
                            {tasks.length}
                          </span>
                        </div>
                        <div className="flex flex-col gap-3">
                          {tasks.map((task, index) => (
                            <Draggable
                              draggableId={String(task.id)}
                              index={index}
                              key={task.id}
                            >
                              {(dragProvided, snapshot) => (
                                <article
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  {...dragProvided.dragHandleProps}
                                  className={`rounded-2xl border border-zinc-200/60 bg-white p-4 shadow-sm transition-shadow ${snapshot.isDragging
                                      ? "shadow-xl"
                                      : "hover:shadow-md"
                                    }`}
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <h3 className="text-sm font-semibold text-zinc-900">
                                      {task.title}
                                    </h3>
                                    <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-900">
                                      {task.priority}
                                    </span>
                                  </div>
                                  <p className="mt-2 text-xs text-zinc-500">
                                    {task.description || "No description."}
                                  </p>
                                  <div className="mt-3 flex items-center justify-between text-[10px] text-zinc-400">
                                    <span>#{task.id}</span>
                                    <span>
                                      {task.deadline
                                        ? new Date(task.deadline).toLocaleDateString()
                                        : "No deadline"}
                                    </span>
                                  </div>
                                </article>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      </section>
                    )}
                  </Droppable>
                );
              })}
            </div>
          </DragDropContext>
        )}
      </main>

      {toast ? (
        <div className="fixed bottom-6 right-6 rounded-2xl bg-zinc-900 px-4 py-3 text-xs font-medium text-amber-100 shadow-xl">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
