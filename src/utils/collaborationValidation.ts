import { useWeb3 } from '../contexts/Web3Context';

export interface CollaborationValidationResult {
  isValid: boolean;
  error?: string;
  errorType?: 'wallet' | 'network' | 'validation' | 'permission';
}

export const validateWalletConnection = (): CollaborationValidationResult => {
  // This would need to be called within a component that has access to useWeb3
  // For now, we'll create a helper function that can be used with the web3 context
  return {
    isValid: true,
    error: undefined,
    errorType: undefined
  };
};

export const validateCollaborationData = (
  collaborators: string[],
  roles: string[],
  currentAccount?: string
): CollaborationValidationResult => {
  // Check if we have at least 2 collaborators
  if (!collaborators || collaborators.length < 2) {
    return {
      isValid: false,
      error: "At least 2 collaborators are required for a collaboration.",
      errorType: 'validation'
    };
  }

  // Check if all addresses are valid Ethereum addresses
  const validAddresses = collaborators.filter(addr => addr.trim() !== '');
  if (validAddresses.length < 2) {
    return {
      isValid: false,
      error: "Please provide at least 2 valid wallet addresses.",
      errorType: 'validation'
    };
  }

  // Validate Ethereum address format
  const addressRegex = /^0x[a-fA-F0-9]{40}$/;
  for (const address of validAddresses) {
    if (!addressRegex.test(address.trim())) {
      return {
        isValid: false,
        error: `Invalid Ethereum address format: ${address}`,
        errorType: 'validation'
      };
    }
  }

  // Check if user is trying to add themselves
  if (currentAccount && validAddresses.some(addr => addr.toLowerCase() === currentAccount.toLowerCase())) {
    return {
      isValid: false,
      error: "You cannot add yourself as a collaborator.",
      errorType: 'validation'
    };
  }

  // Check for duplicate addresses
  const uniqueAddresses = new Set(validAddresses.map(addr => addr.toLowerCase()));
  if (uniqueAddresses.size !== validAddresses.length) {
    return {
      isValid: false,
      error: "Duplicate collaborator addresses are not allowed.",
      errorType: 'validation'
    };
  }

  // Validate roles array length matches collaborators
  if (roles && roles.length !== validAddresses.length) {
    return {
      isValid: false,
      error: "Number of roles must match number of collaborators.",
      errorType: 'validation'
    };
  }

  // Validate role values
  const validRoles = ['author', 'co-author', 'contributor', 'reviewer'];
  if (roles) {
    for (const role of roles) {
      if (!validRoles.includes(role)) {
        return {
          isValid: false,
          error: `Invalid role: ${role}. Valid roles are: ${validRoles.join(', ')}`,
          errorType: 'validation'
        };
      }
    }
  }

  return {
    isValid: true,
    error: undefined,
    errorType: undefined
  };
};

export const validateCollaborationPermissions = (
  collaborationOwner: string,
  currentAccount?: string
): CollaborationValidationResult => {
  if (!currentAccount) {
    return {
      isValid: false,
      error: "Wallet not connected. Please connect your wallet to manage collaborations.",
      errorType: 'wallet'
    };
  }

  if (collaborationOwner.toLowerCase() !== currentAccount.toLowerCase()) {
    return {
      isValid: false,
      error: "You don't have permission to modify this collaboration. Only the collaboration owner can make changes.",
      errorType: 'permission'
    };
  }

  return {
    isValid: true,
    error: undefined,
    errorType: undefined
  };
};

export const getCollaborationErrorType = (error: string): 'wallet' | 'network' | 'validation' | 'permission' | 'unknown' => {
  const lowerError = error.toLowerCase();
  
  if (lowerError.includes('wallet') || lowerError.includes('connect')) {
    return 'wallet';
  }
  
  if (lowerError.includes('network') || lowerError.includes('core testnet')) {
    return 'network';
  }
  
  if (lowerError.includes('permission') || lowerError.includes('owner')) {
    return 'permission';
  }
  
  if (lowerError.includes('invalid') || lowerError.includes('required') || lowerError.includes('format')) {
    return 'validation';
  }
  
  return 'unknown';
}; 