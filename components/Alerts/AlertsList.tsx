'use client';

import { useState } from 'react';
import { AlertModal } from '@/components/Alerts/AlertModal';
import { deleteAlert, toggleAlertActive } from '@/lib/actions/alerts.actions';
import { toast } from 'sonner';
import { Trash2, Edit2, PauseCircle, PlayCircle } from 'lucide-react';

export const AlertsList = ({ alertData }: AlertsListProps) => {
  const [alerts, setAlerts] = useState(alertData || []);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async (alertId: string) => {
    if (!window.confirm('Delete this alert?')) return;

    setIsLoading(true);
    try {
      const res = await deleteAlert({ alertId });
      if (res.success) {
        setAlerts(alerts.filter((a) => a.id !== alertId));
        toast.success('Alert deleted');
      } else {
        toast.error(res.error || 'Failed to delete');
      }
    } catch (error) {
      toast.error('Something went wrong');
      console.log('Delete alert error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async (alertId: string, isActive: boolean) => {
    setIsLoading(true);
    try {
      const res = await toggleAlertActive({ alertId });
      if (res.success) {
        setAlerts(
          alerts.map((a) =>
            a.id === alertId ? { ...a, isActive: !isActive } : a
          )
        );
        toast.success(isActive ? 'Alert paused' : 'Alert resumed');
      } else {
        toast.error(res.error || 'Failed to toggle');
      }
    } catch (error) {
      toast.error('Something went wrong');
      console.log('Toggle alert error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (alert: Alert) => {
    setSelectedAlert(alert);
    setEditModalOpen(true);
  };

  if (!alerts || alerts.length === 0) {
    return (
      <div className="watchlist-alerts">
        <h3 className="watchlist-title">Price Alerts</h3>
        <div className="alert-list">
          <div className="alert-empty">No alerts yet. Set one from the watchlist table.</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="watchlist-alerts">
        <h3 className="watchlist-title">Price Alerts</h3>
        <div className="alert-list">
          {alerts.map((alert) => (
            <div key={alert.id} className="alert-item">
              <div className="flex justify-between items-start">
                <div className="alert-name">{alert.alertName}</div>
                <span className={`text-xs px-2 py-1 rounded ${alert.isActive ? 'bg-yellow-900/30 text-yellow-400' : 'bg-gray-800 text-gray-400'}`}>
                  {alert.isActive ? 'Active' : 'Paused'}
                </span>
              </div>

              <div className="alert-details">
                <span className="alert-company">
                  {alert.company} ({alert.symbol})
                </span>
                <span className="alert-price">${alert.threshold.toFixed(2)}</span>
              </div>

              <div className="text-xs text-gray-500 -mt-2 mb-2">
                Alert when price goes <span className="capitalize">{alert.alertType === 'upper' ? 'above' : 'below'}</span> target
                {alert.currentPrice ? ` • Current: $${alert.currentPrice.toFixed(2)}` : ''}
              </div>

              <div className="alert-actions">
                <button
                  onClick={() => handleToggleActive(alert.id, alert.isActive)}
                  disabled={isLoading}
                  className="alert-update-btn p-1.5"
                  title={alert.isActive ? 'Pause' : 'Resume'}
                >
                  {alert.isActive ? <PauseCircle size={16} /> : <PlayCircle size={16} />}
                </button>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(alert)}
                    disabled={isLoading}
                    className="alert-update-btn p-1.5"
                    title="Edit"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(alert.id)}
                    disabled={isLoading}
                    className="alert-delete-btn p-1.5"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedAlert && (
        <AlertModal
          open={editModalOpen}
          setOpen={setEditModalOpen}
          alertId={selectedAlert.id}
          alertData={{
            symbol: selectedAlert.symbol,
            company: selectedAlert.company,
            alertName: selectedAlert.alertName,
            alertType: selectedAlert.alertType,
            threshold: selectedAlert.threshold.toString(),
          }}
          action="edit"
        />
      )}
    </>
  );
};
