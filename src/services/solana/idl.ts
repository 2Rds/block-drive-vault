/**
 * BlockDrive Solana Program IDL
 * Auto-generated types for the Anchor program
 */

export type BlockDrive = {
  version: "0.1.0";
  name: "blockdrive";
  instructions: [
    {
      name: "initializeVault";
      accounts: [
        { name: "vault"; isMut: true; isSigner: false },
        { name: "owner"; isMut: true; isSigner: true },
        { name: "systemProgram"; isMut: false; isSigner: false }
      ];
      args: [{ name: "masterKeyCommitment"; type: { array: ["u8", 32] } }];
    },
    {
      name: "rotateMasterKey";
      accounts: [
        { name: "vault"; isMut: true; isSigner: false },
        { name: "owner"; isMut: false; isSigner: true }
      ];
      args: [{ name: "newCommitment"; type: { array: ["u8", 32] } }];
    },
    {
      name: "freezeVault";
      accounts: [
        { name: "vault"; isMut: true; isSigner: false },
        { name: "owner"; isMut: false; isSigner: true }
      ];
      args: [];
    },
    {
      name: "unfreezeVault";
      accounts: [
        { name: "vault"; isMut: true; isSigner: false },
        { name: "owner"; isMut: false; isSigner: true }
      ];
      args: [];
    },
    {
      name: "registerFile";
      accounts: [
        { name: "fileRecord"; isMut: true; isSigner: false },
        { name: "vault"; isMut: true; isSigner: false },
        { name: "owner"; isMut: true; isSigner: true },
        { name: "systemProgram"; isMut: false; isSigner: false }
      ];
      args: [
        { name: "fileId"; type: { array: ["u8", 16] } },
        { name: "filenameHash"; type: { array: ["u8", 32] } },
        { name: "fileSize"; type: "u64" },
        { name: "encryptedSize"; type: "u64" },
        { name: "mimeTypeHash"; type: { array: ["u8", 32] } },
        { name: "securityLevel"; type: "u8" },
        { name: "encryptionCommitment"; type: { array: ["u8", 32] } },
        { name: "criticalBytesCommitment"; type: { array: ["u8", 32] } },
        { name: "primaryCid"; type: { array: ["u8", 64] } }
      ];
    },
    {
      name: "updateFileStorage";
      accounts: [
        { name: "fileRecord"; isMut: true; isSigner: false },
        { name: "vault"; isMut: false; isSigner: false },
        { name: "owner"; isMut: false; isSigner: true }
      ];
      args: [
        { name: "redundancyCid"; type: { array: ["u8", 64] } },
        { name: "providerCount"; type: "u8" }
      ];
    },
    {
      name: "archiveFile";
      accounts: [
        { name: "fileRecord"; isMut: true; isSigner: false },
        { name: "vault"; isMut: false; isSigner: false },
        { name: "owner"; isMut: false; isSigner: true }
      ];
      args: [];
    },
    {
      name: "deleteFile";
      accounts: [
        { name: "fileRecord"; isMut: true; isSigner: false },
        { name: "vault"; isMut: true; isSigner: false },
        { name: "owner"; isMut: true; isSigner: true }
      ];
      args: [];
    },
    {
      name: "recordAccess";
      accounts: [
        { name: "fileRecord"; isMut: true; isSigner: false },
        { name: "accessor"; isMut: false; isSigner: true }
      ];
      args: [];
    },
    {
      name: "createDelegation";
      accounts: [
        { name: "delegation"; isMut: true; isSigner: false },
        { name: "fileRecord"; isMut: true; isSigner: false },
        { name: "grantor"; isMut: true; isSigner: true },
        { name: "grantee"; isMut: false; isSigner: false },
        { name: "owner"; isMut: false; isSigner: false },
        { name: "systemProgram"; isMut: false; isSigner: false }
      ];
      args: [
        { name: "encryptedFileKey"; type: { array: ["u8", 128] } },
        { name: "permissionLevel"; type: "u8" },
        { name: "expiresAt"; type: "i64" }
      ];
    },
    {
      name: "revokeDelegation";
      accounts: [
        { name: "delegation"; isMut: true; isSigner: false },
        { name: "fileRecord"; isMut: true; isSigner: false },
        { name: "grantor"; isMut: true; isSigner: true }
      ];
      args: [];
    },
    {
      name: "updateDelegation";
      accounts: [
        { name: "delegation"; isMut: true; isSigner: false },
        { name: "grantor"; isMut: false; isSigner: true }
      ];
      args: [
        { name: "permissionLevel"; type: "u8" },
        { name: "expiresAt"; type: "i64" }
      ];
    }
  ];
  accounts: [
    {
      name: "userVault";
      type: {
        kind: "struct";
        fields: [
          { name: "bump"; type: "u8" },
          { name: "owner"; type: "publicKey" },
          { name: "masterKeyCommitment"; type: { array: ["u8", 32] } },
          { name: "fileCount"; type: "u64" },
          { name: "totalStorage"; type: "u64" },
          { name: "createdAt"; type: "i64" },
          { name: "updatedAt"; type: "i64" },
          { name: "status"; type: { defined: "VaultStatus" } },
          { name: "reserved"; type: { array: ["u8", 64] } }
        ];
      };
    },
    {
      name: "fileRecord";
      type: {
        kind: "struct";
        fields: [
          { name: "bump"; type: "u8" },
          { name: "vault"; type: "publicKey" },
          { name: "owner"; type: "publicKey" },
          { name: "fileId"; type: { array: ["u8", 16] } },
          { name: "filenameHash"; type: { array: ["u8", 32] } },
          { name: "fileSize"; type: "u64" },
          { name: "encryptedSize"; type: "u64" },
          { name: "mimeTypeHash"; type: { array: ["u8", 32] } },
          { name: "securityLevel"; type: { defined: "SecurityLevel" } },
          { name: "encryptionCommitment"; type: { array: ["u8", 32] } },
          { name: "criticalBytesCommitment"; type: { array: ["u8", 32] } },
          { name: "primaryCid"; type: { array: ["u8", 64] } },
          { name: "redundancyCid"; type: { array: ["u8", 64] } },
          { name: "providerCount"; type: "u8" },
          { name: "createdAt"; type: "i64" },
          { name: "accessedAt"; type: "i64" },
          { name: "status"; type: { defined: "FileStatus" } },
          { name: "isShared"; type: "bool" },
          { name: "delegationCount"; type: "u8" },
          { name: "reserved"; type: { array: ["u8", 32] } }
        ];
      };
    },
    {
      name: "delegation";
      type: {
        kind: "struct";
        fields: [
          { name: "bump"; type: "u8" },
          { name: "fileRecord"; type: "publicKey" },
          { name: "grantor"; type: "publicKey" },
          { name: "grantee"; type: "publicKey" },
          { name: "encryptedFileKey"; type: { array: ["u8", 128] } },
          { name: "permissionLevel"; type: { defined: "PermissionLevel" } },
          { name: "expiresAt"; type: "i64" },
          { name: "createdAt"; type: "i64" },
          { name: "isActive"; type: "bool" },
          { name: "isAccepted"; type: "bool" },
          { name: "accessCount"; type: "u64" },
          { name: "lastAccessedAt"; type: "i64" },
          { name: "reserved"; type: { array: ["u8", 32] } }
        ];
      };
    }
  ];
  types: [
    {
      name: "VaultStatus";
      type: {
        kind: "enum";
        variants: [
          { name: "Active" },
          { name: "Frozen" },
          { name: "Deleted" }
        ];
      };
    },
    {
      name: "FileStatus";
      type: {
        kind: "enum";
        variants: [
          { name: "Active" },
          { name: "Archived" },
          { name: "Deleted" }
        ];
      };
    },
    {
      name: "SecurityLevel";
      type: {
        kind: "enum";
        variants: [
          { name: "Standard" },
          { name: "Enhanced" },
          { name: "Maximum" }
        ];
      };
    },
    {
      name: "PermissionLevel";
      type: {
        kind: "enum";
        variants: [
          { name: "View" },
          { name: "Download" },
          { name: "Reshare" }
        ];
      };
    }
  ];
  events: [
    {
      name: "VaultCreated";
      fields: [
        { name: "owner"; type: "publicKey"; index: false },
        { name: "vault"; type: "publicKey"; index: false },
        { name: "timestamp"; type: "i64"; index: false }
      ];
    },
    {
      name: "FileRegistered";
      fields: [
        { name: "vault"; type: "publicKey"; index: false },
        { name: "fileId"; type: { array: ["u8", 16] }; index: false },
        { name: "fileRecord"; type: "publicKey"; index: false },
        { name: "fileSize"; type: "u64"; index: false },
        { name: "encryptedSize"; type: "u64"; index: false },
        { name: "securityLevel"; type: "u8"; index: false },
        { name: "timestamp"; type: "i64"; index: false }
      ];
    },
    {
      name: "DelegationCreated";
      fields: [
        { name: "fileRecord"; type: "publicKey"; index: false },
        { name: "grantor"; type: "publicKey"; index: false },
        { name: "grantee"; type: "publicKey"; index: false },
        { name: "permissionLevel"; type: "u8"; index: false },
        { name: "expiresAt"; type: "i64"; index: false },
        { name: "timestamp"; type: "i64"; index: false }
      ];
    }
  ];
  errors: [
    { code: 6000; name: "VaultAlreadyExists"; msg: "Vault already exists for this wallet" },
    { code: 6001; name: "VaultNotFound"; msg: "Vault not found" },
    { code: 6002; name: "VaultFrozen"; msg: "Vault is frozen" },
    { code: 6003; name: "VaultNotActive"; msg: "Vault is not active" },
    { code: 6004; name: "FileAlreadyExists"; msg: "File already exists" },
    { code: 6005; name: "FileNotFound"; msg: "File not found" },
    { code: 6006; name: "FileNotActive"; msg: "File is not active" },
    { code: 6007; name: "InvalidCommitment"; msg: "Invalid commitment hash" },
    { code: 6008; name: "Unauthorized"; msg: "Unauthorized access" },
    { code: 6009; name: "DelegationExpired"; msg: "Delegation expired" },
    { code: 6010; name: "DelegationNotActive"; msg: "Delegation not active" },
    { code: 6011; name: "InvalidPermissionLevel"; msg: "Invalid permission level" },
    { code: 6012; name: "InvalidSecurityLevel"; msg: "Invalid security level" },
    { code: 6013; name: "CannotDelegateToSelf"; msg: "Cannot delegate to self" },
    { code: 6014; name: "InvalidExpiration"; msg: "Invalid expiration time" }
  ];
};

export const IDL: BlockDrive = {
  version: "0.1.0",
  name: "blockdrive",
  instructions: [
    {
      name: "initializeVault",
      accounts: [
        { name: "vault", isMut: true, isSigner: false },
        { name: "owner", isMut: true, isSigner: true },
        { name: "systemProgram", isMut: false, isSigner: false }
      ],
      args: [{ name: "masterKeyCommitment", type: { array: ["u8", 32] } }]
    },
    {
      name: "rotateMasterKey",
      accounts: [
        { name: "vault", isMut: true, isSigner: false },
        { name: "owner", isMut: false, isSigner: true }
      ],
      args: [{ name: "newCommitment", type: { array: ["u8", 32] } }]
    },
    {
      name: "freezeVault",
      accounts: [
        { name: "vault", isMut: true, isSigner: false },
        { name: "owner", isMut: false, isSigner: true }
      ],
      args: []
    },
    {
      name: "unfreezeVault",
      accounts: [
        { name: "vault", isMut: true, isSigner: false },
        { name: "owner", isMut: false, isSigner: true }
      ],
      args: []
    },
    {
      name: "registerFile",
      accounts: [
        { name: "fileRecord", isMut: true, isSigner: false },
        { name: "vault", isMut: true, isSigner: false },
        { name: "owner", isMut: true, isSigner: true },
        { name: "systemProgram", isMut: false, isSigner: false }
      ],
      args: [
        { name: "fileId", type: { array: ["u8", 16] } },
        { name: "filenameHash", type: { array: ["u8", 32] } },
        { name: "fileSize", type: "u64" },
        { name: "encryptedSize", type: "u64" },
        { name: "mimeTypeHash", type: { array: ["u8", 32] } },
        { name: "securityLevel", type: "u8" },
        { name: "encryptionCommitment", type: { array: ["u8", 32] } },
        { name: "criticalBytesCommitment", type: { array: ["u8", 32] } },
        { name: "primaryCid", type: { array: ["u8", 64] } }
      ]
    },
    {
      name: "updateFileStorage",
      accounts: [
        { name: "fileRecord", isMut: true, isSigner: false },
        { name: "vault", isMut: false, isSigner: false },
        { name: "owner", isMut: false, isSigner: true }
      ],
      args: [
        { name: "redundancyCid", type: { array: ["u8", 64] } },
        { name: "providerCount", type: "u8" }
      ]
    },
    {
      name: "archiveFile",
      accounts: [
        { name: "fileRecord", isMut: true, isSigner: false },
        { name: "vault", isMut: false, isSigner: false },
        { name: "owner", isMut: false, isSigner: true }
      ],
      args: []
    },
    {
      name: "deleteFile",
      accounts: [
        { name: "fileRecord", isMut: true, isSigner: false },
        { name: "vault", isMut: true, isSigner: false },
        { name: "owner", isMut: true, isSigner: true }
      ],
      args: []
    },
    {
      name: "recordAccess",
      accounts: [
        { name: "fileRecord", isMut: true, isSigner: false },
        { name: "accessor", isMut: false, isSigner: true }
      ],
      args: []
    },
    {
      name: "createDelegation",
      accounts: [
        { name: "delegation", isMut: true, isSigner: false },
        { name: "fileRecord", isMut: true, isSigner: false },
        { name: "grantor", isMut: true, isSigner: true },
        { name: "grantee", isMut: false, isSigner: false },
        { name: "owner", isMut: false, isSigner: false },
        { name: "systemProgram", isMut: false, isSigner: false }
      ],
      args: [
        { name: "encryptedFileKey", type: { array: ["u8", 128] } },
        { name: "permissionLevel", type: "u8" },
        { name: "expiresAt", type: "i64" }
      ]
    },
    {
      name: "revokeDelegation",
      accounts: [
        { name: "delegation", isMut: true, isSigner: false },
        { name: "fileRecord", isMut: true, isSigner: false },
        { name: "grantor", isMut: true, isSigner: true }
      ],
      args: []
    },
    {
      name: "updateDelegation",
      accounts: [
        { name: "delegation", isMut: true, isSigner: false },
        { name: "grantor", isMut: false, isSigner: true }
      ],
      args: [
        { name: "permissionLevel", type: "u8" },
        { name: "expiresAt", type: "i64" }
      ]
    }
  ],
  accounts: [
    {
      name: "userVault",
      type: {
        kind: "struct",
        fields: [
          { name: "bump", type: "u8" },
          { name: "owner", type: "publicKey" },
          { name: "masterKeyCommitment", type: { array: ["u8", 32] } },
          { name: "fileCount", type: "u64" },
          { name: "totalStorage", type: "u64" },
          { name: "createdAt", type: "i64" },
          { name: "updatedAt", type: "i64" },
          { name: "status", type: { defined: "VaultStatus" } },
          { name: "reserved", type: { array: ["u8", 64] } }
        ]
      }
    },
    {
      name: "fileRecord",
      type: {
        kind: "struct",
        fields: [
          { name: "bump", type: "u8" },
          { name: "vault", type: "publicKey" },
          { name: "owner", type: "publicKey" },
          { name: "fileId", type: { array: ["u8", 16] } },
          { name: "filenameHash", type: { array: ["u8", 32] } },
          { name: "fileSize", type: "u64" },
          { name: "encryptedSize", type: "u64" },
          { name: "mimeTypeHash", type: { array: ["u8", 32] } },
          { name: "securityLevel", type: { defined: "SecurityLevel" } },
          { name: "encryptionCommitment", type: { array: ["u8", 32] } },
          { name: "criticalBytesCommitment", type: { array: ["u8", 32] } },
          { name: "primaryCid", type: { array: ["u8", 64] } },
          { name: "redundancyCid", type: { array: ["u8", 64] } },
          { name: "providerCount", type: "u8" },
          { name: "createdAt", type: "i64" },
          { name: "accessedAt", type: "i64" },
          { name: "status", type: { defined: "FileStatus" } },
          { name: "isShared", type: "bool" },
          { name: "delegationCount", type: "u8" },
          { name: "reserved", type: { array: ["u8", 32] } }
        ]
      }
    },
    {
      name: "delegation",
      type: {
        kind: "struct",
        fields: [
          { name: "bump", type: "u8" },
          { name: "fileRecord", type: "publicKey" },
          { name: "grantor", type: "publicKey" },
          { name: "grantee", type: "publicKey" },
          { name: "encryptedFileKey", type: { array: ["u8", 128] } },
          { name: "permissionLevel", type: { defined: "PermissionLevel" } },
          { name: "expiresAt", type: "i64" },
          { name: "createdAt", type: "i64" },
          { name: "isActive", type: "bool" },
          { name: "isAccepted", type: "bool" },
          { name: "accessCount", type: "u64" },
          { name: "lastAccessedAt", type: "i64" },
          { name: "reserved", type: { array: ["u8", 32] } }
        ]
      }
    }
  ],
  types: [
    {
      name: "VaultStatus",
      type: {
        kind: "enum",
        variants: [
          { name: "Active" },
          { name: "Frozen" },
          { name: "Deleted" }
        ]
      }
    },
    {
      name: "FileStatus",
      type: {
        kind: "enum",
        variants: [
          { name: "Active" },
          { name: "Archived" },
          { name: "Deleted" }
        ]
      }
    },
    {
      name: "SecurityLevel",
      type: {
        kind: "enum",
        variants: [
          { name: "Standard" },
          { name: "Enhanced" },
          { name: "Maximum" }
        ]
      }
    },
    {
      name: "PermissionLevel",
      type: {
        kind: "enum",
        variants: [
          { name: "View" },
          { name: "Download" },
          { name: "Reshare" }
        ]
      }
    }
  ],
  events: [
    {
      name: "VaultCreated",
      fields: [
        { name: "owner", type: "publicKey", index: false },
        { name: "vault", type: "publicKey", index: false },
        { name: "timestamp", type: "i64", index: false }
      ]
    },
    {
      name: "FileRegistered",
      fields: [
        { name: "vault", type: "publicKey", index: false },
        { name: "fileId", type: { array: ["u8", 16] }, index: false },
        { name: "fileRecord", type: "publicKey", index: false },
        { name: "fileSize", type: "u64", index: false },
        { name: "encryptedSize", type: "u64", index: false },
        { name: "securityLevel", type: "u8", index: false },
        { name: "timestamp", type: "i64", index: false }
      ]
    },
    {
      name: "DelegationCreated",
      fields: [
        { name: "fileRecord", type: "publicKey", index: false },
        { name: "grantor", type: "publicKey", index: false },
        { name: "grantee", type: "publicKey", index: false },
        { name: "permissionLevel", type: "u8", index: false },
        { name: "expiresAt", type: "i64", index: false },
        { name: "timestamp", type: "i64", index: false }
      ]
    }
  ],
  errors: [
    { code: 6000, name: "VaultAlreadyExists", msg: "Vault already exists for this wallet" },
    { code: 6001, name: "VaultNotFound", msg: "Vault not found" },
    { code: 6002, name: "VaultFrozen", msg: "Vault is frozen" },
    { code: 6003, name: "VaultNotActive", msg: "Vault is not active" },
    { code: 6004, name: "FileAlreadyExists", msg: "File already exists" },
    { code: 6005, name: "FileNotFound", msg: "File not found" },
    { code: 6006, name: "FileNotActive", msg: "File is not active" },
    { code: 6007, name: "InvalidCommitment", msg: "Invalid commitment hash" },
    { code: 6008, name: "Unauthorized", msg: "Unauthorized access" },
    { code: 6009, name: "DelegationExpired", msg: "Delegation expired" },
    { code: 6010, name: "DelegationNotActive", msg: "Delegation not active" },
    { code: 6011, name: "InvalidPermissionLevel", msg: "Invalid permission level" },
    { code: 6012, name: "InvalidSecurityLevel", msg: "Invalid security level" },
    { code: 6013, name: "CannotDelegateToSelf", msg: "Cannot delegate to self" },
    { code: 6014, name: "InvalidExpiration", msg: "Invalid expiration time" }
  ]
};
