import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';
import AddItemSheet from '../AddItemSheet';
import SubscriptionModal from '../SubscriptionModal';
import { useUIStore } from '../../store/useUIStore';

export default function AppLayout() {
    const { isAddSheetOpen, closeAddSheet } = useUIStore();

    return (
        <div className="min-h-screen bg-muted/20 flex justify-center">
            <div className="w-full max-w-md bg-background min-h-screen shadow-2xl relative pb-20">
                <main className="h-full overflow-y-auto">
                    <Outlet />
                </main>
                <BottomNav />
                <AddItemSheet isOpen={isAddSheetOpen} onClose={closeAddSheet} />
                <SubscriptionModal />
            </div>
        </div>
    );
}
