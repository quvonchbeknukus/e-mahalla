import { useEffect, useState } from "react";
import { Alert, Button, Modal, ModalBody, ModalHeader, Spinner } from "reactstrap";
import { apiRequest, getAuthErrorMessage } from "../../utils/auth";
import NeighborhoodEditModal from "../NeighborhoodEditModal/NeighborhoodEditModal";
import "./MahallaModal.css";

function MahallaModal({
  selectedMahalla,
  setSelectedMahalla,
  authenticated = false,
  selectedDirectionId = "",
  startDate = "",
  endDate = "",
  onNeighborhoodUpdated,
}) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editModalOpen, setEditModalOpen] = useState(false);

  useEffect(() => {
    if (!selectedMahalla?.id) {
      setDetails(null);
      setError("");
      setLoading(false);
      setEditModalOpen(false);
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
              <Button
                type="button"
                color="primary"
                size="sm"
                className="mahalla-edit-btn"
                onClick={() => setEditModalOpen(true)}
              >
                Tahrirlash
              </Button>
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
                  <div className="work-meta">
                    <span>{item.date}</span>
                    <span>{item.direction?.name || "Yo'nalish yo'q"}</span>
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
                        <a
                          key={image.id}
                          href={image.image_url}
                          target="_blank"
                          rel="noreferrer"
                          className="work-image-link"
                        >
                          <img
                            src={image.image_url}
                            alt={item.text}
                            className="work-image"
                          />
                        </a>
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
    </>
  );
}

export default MahallaModal;
