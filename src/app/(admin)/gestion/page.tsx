'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { fetchWithAuth, parseApiError } from '@/lib/api';
import {
  BookingDetailModal,
  type BookingDetailData,
} from '@/components/bookings/BookingDetailModal';
import {
  AdminHeader,
  AdminSpacesSection,
  AdminBookingsSection,
  SpaceFormModal,
  SpaceDeactivateDialog,
  DEFAULT_SPACE_FORM,
  type SpaceItem,
  type AdminBookingItem,
  type SpaceFormState,
  type AdminSection,
} from '@/features/admin';

export default function GestionPage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<AdminSection>('SPACES');
  const [spaces, setSpaces] = useState<SpaceItem[]>([]);
  const [bookings, setBookings] = useState<AdminBookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [bookingSearch, setBookingSearch] = useState('');
  const [nowMs] = useState(() => Date.now());

  // Modal de detalle de reserva
  const [selectedBooking, setSelectedBooking] = useState<BookingDetailData | null>(null);

  // Modal de desactivación (RN-12, RN-13)
  const [selectedDeactivate, setSelectedDeactivate] = useState<SpaceItem | null>(null);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  // Modal de Crear / Editar Espacio (RF-08, RF-09)
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingSpace, setEditingSpace] = useState<SpaceItem | null>(null);
  const [formState, setFormState] = useState<SpaceFormState & { isActive?: boolean }>(
    DEFAULT_SPACE_FORM
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [savingForm, setSavingForm] = useState(false);

  // Estados de acción interactiva
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);

  const loadGestionData = useCallback(async () => {
    try {
      setLoading(true);
      const [spacesRes, bookingsRes] = await Promise.all([
        fetchWithAuth('/api/spaces?all=true'),
        fetchWithAuth('/api/bookings?all=true'),
      ]);

      if (spacesRes.status === 401 || bookingsRes.status === 401) {
        router.push('/?auth=login&redirect=/gestion');
        return;
      }

      if (spacesRes.ok) {
        const sData = await spacesRes.json();
        if (Array.isArray(sData?.spaces)) {
          setSpaces(
            sData.spaces.map((s: SpaceItem) => ({
              ...s,
              pricePerHour: Number(s.pricePerHour),
            }))
          );
        }
      }

      if (bookingsRes.ok) {
        const bData = await bookingsRes.json();
        if (Array.isArray(bData?.bookings)) {
          setBookings(bData.bookings);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadGestionData();
  }, [loadGestionData]);

  const openCreateModal = () => {
    setEditingSpace(null);
    setFormState(DEFAULT_SPACE_FORM);
    setFormError(null);
    setFormModalOpen(true);
  };

  const openEditModal = (space: SpaceItem) => {
    setEditingSpace(space);
    setFormState({
      name: space.name,
      description: space.description,
      type: space.type,
      capacity: String(space.capacity),
      pricePerHour: String(space.pricePerHour),
      imageUrl: space.imageUrl,
      isActive: space.isActive,
    });
    setFormError(null);
    setFormModalOpen(true);
  };

  const handleSaveSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingForm(true);
    setFormError(null);

    const payload = {
      name: formState.name.trim(),
      description: formState.description.trim(),
      type: formState.type,
      capacity: parseInt(formState.capacity, 10),
      pricePerHour: parseFloat(formState.pricePerHour),
      imageUrl: formState.imageUrl.trim(),
      ...(editingSpace ? { isActive: formState.isActive } : {}),
    };

    try {
      const url = editingSpace ? `/api/spaces/${editingSpace.id}` : '/api/spaces';
      const method = editingSpace ? 'PUT' : 'POST';

      const res = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const message = await parseApiError(res, 'No se pudo guardar el espacio.');
        setFormError(message);
        return;
      }

      setFormModalOpen(false);
      await loadGestionData();
    } catch {
      setFormError('Error de red al guardar el espacio.');
    } finally {
      setSavingForm(false);
    }
  };

  const handleActivateSpace = async (spaceId: string) => {
    setActivatingId(spaceId);
    try {
      const res = await fetchWithAuth(`/api/spaces/${spaceId}/activate`, {
        method: 'PATCH',
      });
      if (res.ok) {
        await loadGestionData();
      }
    } finally {
      setActivatingId(null);
    }
  };

  const confirmDeactivate = async () => {
    if (!selectedDeactivate) return;
    setDeactivating(true);
    setDeactivateError(null);

    try {
      const res = await fetchWithAuth(
        `/api/spaces/${selectedDeactivate.id}/deactivate`,
        { method: 'PATCH' }
      );

      if (!res.ok) {
        const message = await parseApiError(
          res,
          'No se pudo desactivar el espacio.'
        );
        setDeactivateError(message);
        return;
      }

      setSelectedDeactivate(null);
      await loadGestionData();
    } catch {
      setDeactivateError('Error de conexión con el servidor.');
    } finally {
      setDeactivating(false);
    }
  };

  const handleAdminCancelBooking = async (bookingId: string) => {
    setCancellingBookingId(bookingId);
    try {
      const res = await fetchWithAuth(`/api/bookings/${bookingId}/cancel`, {
        method: 'PATCH',
      });
      if (res.ok) {
        await loadGestionData();
      }
    } finally {
      setCancellingBookingId(null);
    }
  };

  const activeSpacesCount = spaces.filter((s) => s.isActive).length;
  const futureConfirmedBookings = bookings.filter(
    (b) => b.status === 'CONFIRMED' && new Date(b.startTime).getTime() > nowMs
  );
  const confirmedRevenue = bookings
    .filter((b) => b.status === 'CONFIRMED')
    .reduce((acc, b) => acc + Number(b.totalPrice), 0);

  return (
    <section className="mx-auto max-w-6xl px-5 pb-24 pt-36">
      <AdminHeader
        spacesCount={spaces.length}
        activeSpacesCount={activeSpacesCount}
        futureConfirmedCount={futureConfirmedBookings.length}
        confirmedRevenue={confirmedRevenue}
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        onOpenCreateSpace={openCreateModal}
      />

      {activeSection === 'SPACES' ? (
        <AdminSpacesSection
          spaces={spaces}
          search={search}
          onSearchChange={setSearch}
          loading={loading}
          activatingId={activatingId}
          onOpenEdit={openEditModal}
          onOpenDeactivate={(space) => {
            setDeactivateError(null);
            setSelectedDeactivate(space);
          }}
          onActivate={handleActivateSpace}
        />
      ) : (
        <AdminBookingsSection
          bookings={bookings}
          bookingSearch={bookingSearch}
          onBookingSearchChange={setBookingSearch}
          loading={loading}
          nowMs={nowMs}
          cancellingBookingId={cancellingBookingId}
          onSelectBooking={(b) => setSelectedBooking(b)}
          onCancelBooking={handleAdminCancelBooking}
        />
      )}

      {/* Modal de Detalle de Reserva */}
      <BookingDetailModal
        booking={selectedBooking}
        isAdmin={true}
        onClose={() => setSelectedBooking(null)}
        onRequestCancel={(b) => handleAdminCancelBooking(b.id)}
      />

      {/* Modal de Crear / Editar Espacio */}
      <SpaceFormModal
        isOpen={formModalOpen}
        editingSpace={editingSpace}
        formState={formState}
        setFormState={setFormState}
        formError={formError}
        saving={savingForm}
        onClose={() => setFormModalOpen(false)}
        onSubmit={handleSaveSpace}
      />

      {/* Diálogo de Desactivación Segura */}
      <SpaceDeactivateDialog
        space={selectedDeactivate}
        deactivating={deactivating}
        error={deactivateError}
        onClose={() => setSelectedDeactivate(null)}
        onConfirm={confirmDeactivate}
      />
    </section>
  );
}
