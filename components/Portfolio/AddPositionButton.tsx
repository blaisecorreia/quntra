'use client';

import { useState } from 'react';
import { PositionModal } from '@/components/Portfolio/PositionModal';
import { Plus } from 'lucide-react';

export const AddPositionButton = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)} className="yellow-btn inline-flex items-center gap-2 px-6">
        <Plus size={18} />
        Add Position
      </button>

      <PositionModal open={open} setOpen={setOpen} action="buy" />
    </>
  );
};
