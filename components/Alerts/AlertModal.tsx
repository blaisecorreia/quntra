'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ALERT_TYPE_OPTIONS } from '@/lib/constants';
import { createAlert, updateAlert } from '@/lib/actions/alerts.actions';
import { toast } from 'sonner';

export const AlertModal = ({
  open,
  setOpen,
  alertId,
  alertData,
  action = 'create',
}: AlertModalProps) => {
  const isEdit = action === 'edit';
  const [isLoading, setIsLoading] = useState(false);

  const { control, register, handleSubmit, formState: { errors }, reset } = useForm<AlertData>({
    defaultValues: alertData || {
      symbol: '',
      company: '',
      alertName: '',
      alertType: 'upper',
      threshold: '',
    },
  });

  const onSubmit = async (data: AlertData) => {
    setIsLoading(true);
    try {
      const threshold = parseFloat(data.threshold);
      if (isNaN(threshold)) {
        toast.error('Threshold must be a valid number');
        setIsLoading(false);
        return;
      }

      if (isEdit && alertId) {
        const res = await updateAlert({
          alertId,
          ...data,
          threshold: data.threshold,
        });
        if (res.success) {
          toast.success('Alert updated');
          setOpen(false);
          reset();
        } else {
          toast.error(res.error || 'Failed to update alert');
        }
      } else {
        const res = await createAlert({
          ...data,
          threshold: data.threshold,
        });
        if (res.success) {
          toast.success('Alert created');
          setOpen(false);
          reset();
        } else {
          toast.error(res.error || 'Failed to create alert');
        }
      }
    } catch (error) {
      toast.error('Something went wrong');
      console.log('Alert modal error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="alert-dialog">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Alert' : 'Create Alert'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Symbol</Label>
            <Input disabled value={alertData?.symbol || ''} />
          </div>

          <div className="space-y-2">
            <Label>Company</Label>
            <Input disabled value={alertData?.company || ''} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="alertName">Alert Name *</Label>
            <Input
              id="alertName"
              placeholder="e.g., Price Target 1"
              {...register('alertName', { required: 'Alert name is required' })}
            />
            {errors.alertName && <p className="text-red-400 text-sm">{errors.alertName.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="alertType">Alert Type *</Label>
            <Controller
              name="alertType"
              control={control}
              render={({ field }) => (
                <select
                  id="alertType"
                  {...field}
                  className="select-trigger w-full"
                >
                  {ALERT_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="threshold">Target Price *</Label>
            <Input
              id="threshold"
              type="number"
              step="0.01"
              placeholder="e.g., 150.50"
              {...register('threshold', { required: 'Target price is required' })}
            />
            {errors.threshold && <p className="text-red-400 text-sm">{errors.threshold.message}</p>}
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : isEdit ? 'Update Alert' : 'Create Alert'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
