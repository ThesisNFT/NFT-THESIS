import React, { useState } from 'react';
import { Button } from '../buttons/Button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../cards/Card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { WalletConnectionError } from './WalletConnectionError';
import { collaborationService } from '../../services/socialService';
import { useToast } from '../../hooks/use-toast';
import { useWeb3 } from '../../contexts/Web3Context';
import { validateCollaborationData } from '../../utils/collaborationValidation';
import { UserPlus, X } from 'lucide-react';

interface Collaborator {
  address: string;
  role: string;
}

interface CollabInviteFormProps {
  nftId: string;
  onCollaborationCreated?: (collab: any) => void;
}

export const CollabInviteForm: React.FC<CollabInviteFormProps> = ({ 
  nftId, 
  onCollaborationCreated 
}) => {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([
    { address: '', role: 'author' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { toast } = useToast();
  const { currentAccount, isConnected, isCorrectNetwork } = useWeb3();

  const handleAddressChange = (index: number, value: string) => {
    setCollaborators(prev =>
      prev.map((collab, i) => i === index ? { ...collab, address: value } : collab)
    );
  };

  const handleRoleChange = (index: number, role: string) => {
    setCollaborators(prev =>
      prev.map((collab, i) => i === index ? { ...collab, role } : collab)
    );
  };

  const addCollaborator = () => {
    setCollaborators(prev => [...prev, { address: '', role: 'author' }]);
  };

  const removeCollaborator = (index: number) => {
    if (collaborators.length > 1) {
      setCollaborators(prev => prev.filter((_, i) => i !== index));
    }
  };

  const validateAddresses = (addresses: string[]) => {
    const validAddresses = addresses.filter(addr => addr.trim() !== '');
    return validAddresses.length >= 2 && validAddresses.every(addr => 
      /^0x[a-fA-F0-9]{40}$/.test(addr.trim())
    );
  };

  const handleInvite = async () => {
    setFormError(null);
    // Check wallet connection first
    if (!isConnected || !currentAccount) {
      setFormError('Please connect your wallet to create collaborations.');
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to create collaborations.",
        variant: "destructive",
      });
      return;
    }

    // Check network
    if (!isCorrectNetwork) {
      setFormError('Please switch to CORE Testnet to create collaborations.');
      toast({
        title: "Wrong Network",
        description: "Please switch to CORE Testnet to create collaborations.",
        variant: "destructive",
      });
      return;
    }

    const addresses = collaborators.map(c => c.address.trim()).filter(addr => addr !== '');
    const roles = collaborators.map(c => c.role).filter((_, i) => collaborators[i].address.trim() !== '');

    // Use the validation utility
    const validation = validateCollaborationData(addresses, roles, currentAccount);
    if (!validation.isValid) {
      setFormError(validation.error || 'Invalid input.');
      toast({
        title: "Validation Error",
        description: validation.error,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setFormError(null);
    try {
      const result = await collaborationService.createCollaboration({
        nftId,
        collaborators: addresses,
        roles,
        status: 'pending'
      });
      
      if (result._id) {
        toast({
          title: "Collaboration Created",
          description: "Collaborators have been invited successfully.",
        });
        setCollaborators([{ address: '', role: 'author' }]);
        onCollaborationCreated?.(result);
      } else {
        setFormError(result.error || 'Failed to create collaboration.');
        toast({
          title: "Error",
          description: result.error || "Failed to create collaboration.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      setFormError(error.message || 'Failed to create collaboration. Please try again.');
      toast({
        title: "Error",
        description: error.message || "Failed to create collaboration. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show wallet connection error if not connected or wrong network
  if (!isConnected || !currentAccount || !isCorrectNetwork) {
    return (
      <WalletConnectionError
        title="Wallet Required"
        description="Please connect your wallet to invite collaborators to this NFT."
        feature="collaboration invitation"
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <UserPlus className="h-5 w-5" />
          <span>Invite Collaborators</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">
          Invite other researchers to collaborate on this NFT. Each collaborator will have shared ownership and rights.
        </p>

        {/* Show current user info */}
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            <span className="font-semibold">Your Address:</span> {currentAccount.slice(0, 6)}...{currentAccount.slice(-4)}
          </p>
          <p className="text-xs text-blue-600 mt-1">You will be the lead collaborator</p>
        </div>

        {collaborators.map((collaborator, index) => (
          <div key={index} className="flex space-x-2 items-start">
            <div className="flex-1 space-y-2">
              <Label htmlFor={`address-${index}`}>Wallet Address</Label>
              <Input
                id={`address-${index}`}
                value={collaborator.address}
                onChange={(e) => handleAddressChange(index, e.target.value)}
                placeholder="0x..."
                className={`font-mono text-sm ${formError && !collaborator.address ? 'border-red-500' : ''}`}
              />
            </div>
            
            <div className="w-32 space-y-2">
              <Label htmlFor={`role-${index}`}>Role</Label>
              <Select
                value={collaborator.role}
                onValueChange={(role) => handleRoleChange(index, role)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="author">Author</SelectItem>
                  <SelectItem value="co-author">Co-Author</SelectItem>
                  <SelectItem value="contributor">Contributor</SelectItem>
                  <SelectItem value="reviewer">Reviewer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {collaborators.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => removeCollaborator(index)}
                className="mt-6"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}

        <div className="flex space-x-2">
          <Button onClick={addCollaborator} variant="outline" size="sm">
            <UserPlus className="h-4 w-4 mr-1" />
            Add Collaborator
          </Button>
        </div>

        {/* Error message display */}
        {formError && (
          <div className="text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm font-medium">
            {formError}
          </div>
        )}

        <div className="pt-4 border-t">
          <Button 
            onClick={handleInvite} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Creating Collaboration...' : 'Create Collaboration'}
          </Button>
        </div>

        <div className="text-xs text-gray-500">
          <p>• All collaborators will have shared ownership of the NFT</p>
          <p>• Revenue and royalties will be split according to roles</p>
          <p>• Collaborators can vote on important decisions</p>
        </div>
      </CardContent>
    </Card>
  );
}; 