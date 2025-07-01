import React from 'react';
import { Card, CardContent } from '../cards/Card';
import { Button } from '../buttons/Button';
import { useWeb3 } from '../../contexts/Web3Context';
import { Wallet, AlertCircle, Wifi, WifiOff } from 'lucide-react';

interface WalletConnectionErrorProps {
  title?: string;
  description?: string;
  feature?: string;
  className?: string;
}

export const WalletConnectionError: React.FC<WalletConnectionErrorProps> = ({
  title = "Connect Your Wallet",
  description = "Please connect your wallet to continue.",
  feature = "this feature",
  className = ""
}) => {
  const { isConnected, isCorrectNetwork, networkStatus, connectWallet } = useWeb3();

  const handleConnectWallet = async () => {
    try {
      await connectWallet();
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  // Wallet not connected
  if (!isConnected) {
    return (
      <Card className={`backdrop-blur-xl bg-gradient-to-br from-blue-900/60 to-black/80 border border-blue-700/40 shadow-2xl rounded-2xl ${className}`}>
        <CardContent className="text-center py-12">
          <div className="p-4 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <Wallet className="w-10 h-10 text-yellow-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2 text-blue-200">{title}</h2>
          <p className="text-gray-400 mb-6">
            {description}
          </p>
          <Button 
            onClick={handleConnectWallet}
            disabled={networkStatus === 'checking'}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 rounded-xl shadow-lg transition-all"
          >
            {networkStatus === 'checking' ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Checking Network...
              </>
            ) : (
              <>
                <Wallet className="w-4 h-4 mr-2" />
                Connect Wallet
              </>
            )}
          </Button>
          <div className="mt-4 text-xs text-gray-500 space-y-1">
            <p>• Connect your wallet to use {feature}</p>
            <p>• Ensure you're on CORE Testnet</p>
            <p>• Have MetaMask or compatible wallet installed</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Wrong network
  if (!isCorrectNetwork && networkStatus !== 'checking') {
    return (
      <Card className={`backdrop-blur-xl bg-gradient-to-br from-red-900/60 to-black/80 border border-red-700/40 shadow-2xl rounded-2xl ${className}`}>
        <CardContent className="text-center py-12">
          <div className="p-4 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <WifiOff className="w-10 h-10 text-red-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2 text-red-200">Wrong Network</h2>
          <p className="text-gray-400 mb-6">
            Please switch to CORE Testnet to use {feature}. Your wallet is currently connected to a different network.
          </p>
          <Button 
            onClick={handleConnectWallet}
            className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-semibold py-3 rounded-xl shadow-lg transition-all"
          >
            <Wifi className="w-4 h-4 mr-2" />
            Switch to CORE Testnet
          </Button>
          <div className="mt-4 text-xs text-gray-500">
            <p>{feature} requires CORE Testnet connection</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Network checking
  if (networkStatus === 'checking') {
    return (
      <Card className={`backdrop-blur-xl bg-gradient-to-br from-blue-900/60 to-black/80 border border-blue-700/40 shadow-2xl rounded-2xl ${className}`}>
        <CardContent className="text-center py-12">
          <div className="p-4 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
          </div>
          <h2 className="text-2xl font-bold mb-2 text-blue-200">Checking Network</h2>
          <p className="text-gray-400 mb-6">
            Verifying your network connection...
          </p>
          <div className="mt-4 text-xs text-gray-500">
            <p>Please wait while we check your network</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}; 