import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { LoginScreen } from './components/LoginScreen';
import { ProfileModal } from './components/ProfileModal';
import { ChannelList } from './components/ChannelList';
import { ChannelView } from './components/ChannelView';
import { Channel } from './types';
import { Radio } from 'lucide-react';

const MainApp: React.FC = () => {
  const { user, profile, loading, needsProfileSetup } = useAuth();

  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <div className="w-16 h-16 rounded-2xl bg-orange-600/20 border border-orange-500/40 flex items-center justify-center text-orange-500 mb-4 animate-pulse">
          <Radio className="w-8 h-8" />
        </div>
        <div className="font-['Chakra_Petch',sans-serif] font-bold text-lg text-white tracking-widest uppercase">
          Sintonizando Frecuencias…
        </div>
        <span className="text-xs text-slate-500 font-mono mt-1">Conectando a VozDeObra</span>
      </div>
    );
  }

  // Not signed in
  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <Header
        currentChannelName={selectedChannel?.name}
        onBackToChannels={selectedChannel ? () => setSelectedChannel(null) : undefined}
        onOpenProfile={() => setShowProfileModal(true)}
      />

      {/* Main Content: Channel View or Channel List */}
      <main className="flex-1 flex flex-col">
        {selectedChannel ? (
          <ChannelView channel={selectedChannel} />
        ) : (
          <ChannelList onSelectChannel={(channel) => setSelectedChannel(channel)} />
        )}
      </main>

      {/* Profile Setup / Edit Modal */}
      <ProfileModal
        isOpen={needsProfileSetup || showProfileModal}
        onClose={() => setShowProfileModal(false)}
        isInitialSetup={needsProfileSetup}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
