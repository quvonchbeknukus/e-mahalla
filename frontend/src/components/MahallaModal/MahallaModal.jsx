import { useEffect, useState } from "react";
import { Alert, Button, Modal, ModalBody, ModalHeader, Spinner } from "reactstrap";
import { apiRequest, getAuthErrorMessage } from "../../utils/auth";
import ImagePreviewModal from "../ImagePreviewModal/ImagePreviewModal";
import NeighborhoodEditModal from "../NeighborhoodEditModal/NeighborhoodEditModal";
import TaskEditModal from "../TaskEditModal/TaskEditModal";
import "./MahallaModal.css";

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        d="m4 17.25 9.06-9.06 3.75 3.75L7.75 21H4v-3.75Zm11.87-10.19 1.41-1.41a2 2 0 0 1 2.83 2.83l-1.41 1.41-3.75-3.75Z"
        fill="currentColor"
      />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 7h2v8h-2v-8Zm4 0h2v8h-2v-8ZM7 10h2v8H7v-8Zm-1 10h12l1-13H5l1 13Z"
        fill="currentColor"
      />
    </svg>
  );
}

function sortTasks(tasks = []) {
  return [...tasks].sort((firstTask, secondTask) => {
    if (firstTask.date === secondTask.date) {
      return secondTask.id - firstTask.id;
    }

    return firstTask.date < secondTask.date ? 1 : -1;
  });
}

function getTodayDateKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function MahallaModal({
  selectedMahalla,
  setSelectedMahalla,
  authenticated = false,
  selectedDirectionId = "",
  startDate = "",
  endDate = "",
  onNeighborhoodUpdated,
  onNeighborhoodCreated,
  onNeighborhoodDeleted,
  directionOptions = [],
  onTaskUpdated,
  onTaskDeleted,
}) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [taskEditModalOpen, setTaskEditModalOpen] = useState(false);
  const [activeTask, setActiveTask] = useState(null);
  const [deletingTaskId, setDeletingTaskId] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => {
    if (!selectedMahalla?.id) {
      setDetails(null);
      setError("");
      setLoading(false);
      setEditModalOpen(false);
      setCreateModalOpen(false);
      setDeleteSubmitting(false);
      setTaskEditModalOpen(false);
      setActiveTask(null);
      setDeletingTaskId(null);
      setPreviewImage(null);
      return;
    }

    let active = true;

    const loadNeighborhoodDetails = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await apiRequest(`/neighborhoods/${selectedMahalla.id}`);

        if (active) {
          setDetails(response.data ?? null);
        }
      } catch (requestError) {
        if (active) {
          setError(getAuthErrorMessage(requestError));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadNeighborhoodDetails();

    return () => {
      active = false;
    };
  }, [selectedMahalla]);

  const modalData = details ?? selectedMahalla;
  const tasks = (details?.tasks ?? []).filter((item) => {
    if (
      selectedDirectionId &&
      String(item.direction_id) !== selectedDirectionId
    ) {
      return false;
    }

    if (startDate && item.date < startDate) {
      return false;
    }

    if (endDate && item.date > endDate) {
      return false;
    }

    return true;
  });

  const handleNeighborhoodEditSuccess = (updatedNeighborhood) => {
    setDetails(updatedNeighborhood);
    setSelectedMahalla(updatedNeighborhood);
    setEditModalOpen(false);
    onNeighborhoodUpdated?.(updatedNeighborhood);
  };

  const updateDetailsTasks = (updater) => {
    setDetails((currentDetails) => {
      if (!currentDetails) {
        return currentDetails;
      }

      const currentTasks = currentDetails.tasks ?? [];
      const nextTasks = sortTasks(updater(currentTasks));
      const todayDateKey = getTodayDateKey();

      return {
        ...currentDetails,
        tasks: nextTasks,
        total_tasks_count: nextTasks.length,
        today_tasks_count: nextTasks.filter((task) => task.date === todayDateKey).length,
      };
    });
  };

  const handleNeighborhoodCreateSuccess = (createdNeighborhood) => {
    setDetails(createdNeighborhood);
    setSelectedMahalla(createdNeighborhood);
    setCreateModalOpen(false);
    onNeighborhoodCreated?.(createdNeighborhood);
  };

  const handleDelete = async () => {
    if (!modalData?.id || deleteSubmitting) {
      return;
    }

    const shouldDelete = window.confirm(
      `"${modalData.name}" mahallasini o'chirmoqchimisiz? Bu mahallaga bog'langan ishlar ham o'chadi.`
    );

    if (!shouldDelete) {
      return;
    }

    setDeleteSubmitting(true);
    setError("");

    try {
      await apiRequest(`/neighborhoods/${modalData.id}`, {
        method: "DELETE",
        authenticated: true,
        stopOnStatuses: [401, 404],
      });

      setSelectedMahalla(null);
      onNeighborhoodDeleted?.(modalData.id);
    } catch (requestError) {
      setError(getAuthErrorMessage(requestError));
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleTaskEditOpen = (task) => {
    setActiveTask(task);
    setTaskEditModalOpen(true);
    setError("");
  };

  const handleTaskEditSuccess = (updatedTask) => {
    updateDetailsTasks((currentTasks) =>
      currentTasks.map((task) => (task.id === updatedTask.id ? updatedTask : task))
    );
    setTaskEditModalOpen(false);
    onTaskUpdated?.(updatedTask, activeTask);
    setActiveTask(updatedTask);
  };

  const handleTaskImageDeleted = (taskId, imageId) => {
    updateDetailsTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              images: (task.images ?? []).filter((image) => image.id !== imageId),
            }
          : task
      )
    );

    setActiveTask((currentTask) =>
      currentTask?.id === taskId
        ? {
            ...currentTask,
            images: (currentTask.images ?? []).filter((image) => image.id !== imageId),
          }
        : currentTask
    );
  };

  const handleTaskDelete = async (task) => {
    if (!task?.id || deletingTaskId === task.id) {
      return;
    }

    const shouldDelete = window.confirm("Ushbu taskni o'chirmoqchimisiz?");

    if (!shouldDelete) {
      return;
    }

    setDeletingTaskId(task.id);
    setError("");

    try {
      await apiRequest(`/tasks/${task.id}`, {
        method: "DELETE",
        authenticated: true,
        stopOnStatuses: [401, 404],
      });

      updateDetailsTasks((currentTasks) =>
        currentTasks.filter((currentTask) => currentTask.id !== task.id)
      );
      onTaskDeleted?.(task);
    } catch (requestError) {
      setError(getAuthErrorMessage(requestError));
    } finally {
      setDeletingTaskId(null);
    }
  };

  return (
    <>
      <Modal
        isOpen={selectedMahalla !== null}
        toggle={() => setSelectedMahalla(null)}
        size="xl"
      >
        <ModalHeader toggle={() => setSelectedMahalla(null)}>
          <div className="mahalla-modal-header">
            <span>{modalData?.name}</span>

            {authenticated && modalData?.id && (
              <div className="mahalla-modal-actions">
                <Button
                  type="button"
                  color="success"
                  size="sm"
                  className="mahalla-action-btn"
                  onClick={() => setCreateModalOpen(true)}
                >
                  Qo'shish
                </Button>

                <Button
                  type="button"
                  color="primary"
                  size="sm"
                  className="mahalla-action-btn"
                  onClick={() => setEditModalOpen(true)}
                >
                  Tahrirlash
                </Button>

                {/* <Button
                  type="button"
                  color="danger"
                  size="sm"
                  className="mahalla-action-btn"
                  onClick={handleDelete}
                  disabled={deleteSubmitting}
                >
                  {deleteSubmitting ? "O'chirilmoqda..." : "O'chirish"}
                </Button> */}
              </div>
            )}
          </div>
        </ModalHeader>

        <ModalBody>
          <div className="mahalla-info-grid">
            <div className="mahalla-info-card">
              <span>Jami ishlar</span>
              <strong>{tasks.length || modalData?.total_tasks_count || 0}</strong>
            </div>

            <div className="mahalla-info-card">
              <span>Mahalla raisi</span>
              <strong>{modalData?.neighborhood_chairman || "-"}</strong>
            </div>

            <div className="mahalla-info-card">
              <span>Telefon</span>
              <strong>{modalData?.neighborhood_phone || "-"}</strong>
            </div>

            <div className="mahalla-info-card">
              <span>Profilaktika inspektori</span>
              <strong>{modalData?.prevention_inspector || "-"}</strong>
            </div>
          </div>

          {error && <Alert color="danger">{error}</Alert>}

          {loading ? (
            <div className="mahalla-loading">
              <Spinner color="primary" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="mahalla-empty">
              Bu mahalla uchun hozircha task kiritilmagan.
            </div>
          ) : (
            <div className="work-list">
              {tasks.map((item) => (
                <div className="work-block" key={item.id}>
                  <div className="work-block-header">
                    <div className="work-meta">
                      <span>{item.date}</span>
                      <span>{item.direction?.name || "Yo'nalish yo'q"}</span>
                    </div>

                    {authenticated && (
                      <div className="work-actions">
                        <button
                          type="button"
                          className="work-icon-btn"
                          onClick={() => handleTaskEditOpen(item)}
                          aria-label="Taskni tahrirlash"
                          title="Taskni tahrirlash"
                        >
                          <EditIcon />
                        </button>

                        {/* <button
                          type="button"
                          className="work-icon-btn work-icon-btn--danger"
                          onClick={() => handleTaskDelete(item)}
                          disabled={deletingTaskId === item.id}
                          aria-label="Taskni o'chirish"
                          title="Taskni o'chirish"
                        >
                          <DeleteIcon />
                        </button> */}
                      </div>
                    )}
                  </div>

                  <p className="work-text">{item.text}</p>

                  {item.images?.length > 0 && (
                    <div
                      className={
                        item.images.length === 1
                          ? "work-images work-images--single"
                          : "work-images work-images--grid"
                      }
                    >
                      {item.images.map((image) => (
                        <button
                          key={image.id}
                          type="button"
                          className="work-image-link work-image-button"
                          onClick={() =>
                            setPreviewImage({
                              imageUrl: image.image_url,
                              alt: item.text,
                            })
                          }
                        >
                          <img
                            src={image.image_url}
                            alt={item.text}
                            className="work-image"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ModalBody>
      </Modal>

      <NeighborhoodEditModal
        isOpen={editModalOpen}
        toggle={() => setEditModalOpen(false)}
        neighborhood={modalData}
        onSuccess={handleNeighborhoodEditSuccess}
      />

      <NeighborhoodEditModal
        isOpen={createModalOpen}
        toggle={() => setCreateModalOpen(false)}
        neighborhood={null}
        onSuccess={handleNeighborhoodCreateSuccess}
        mode="create"
      />

      <TaskEditModal
        isOpen={taskEditModalOpen}
        toggle={() => setTaskEditModalOpen(false)}
        task={activeTask}
        directionOptions={directionOptions}
        onSuccess={handleTaskEditSuccess}
        onImageDeleted={handleTaskImageDeleted}
      />

      <ImagePreviewModal
        isOpen={Boolean(previewImage)}
        toggle={() => setPreviewImage(null)}
        imageUrl={previewImage?.imageUrl}
        alt={previewImage?.alt}
      />
    </>
  );
}

export default MahallaModal;
