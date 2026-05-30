/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/solflip.json`.
 */
export type Solflip = {
  "address": "AfiEkweWBAgbfZe97PH8kdfZXbQFeaetV1CoC48nr3rB",
  "metadata": {
    "name": "solflip",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "SolFlip — provably-fair coin-flip casino on Solana (ORAO VRF)"
  },
  "instructions": [
    {
      "name": "deposit",
      "docs": [
        "Deposit SOL into the casino. Moves real lamports user -> vault and",
        "credits the player's internal balance."
      ],
      "discriminator": [
        242,
        35,
        198,
        137,
        82,
        225,
        242,
        182
      ],
      "accounts": [
        {
          "name": "player",
          "writable": true,
          "signer": true
        },
        {
          "name": "house",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  104,
                  111,
                  117,
                  115,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "playerAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  121,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "player"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "fundTreasury",
      "docs": [
        "Add bankroll to the vault. Permissionless: the deployer (or anyone) can",
        "top up the house bankroll. Funds added here are *not* a player liability;",
        "they are the equity that lets the house pay winners."
      ],
      "discriminator": [
        71,
        154,
        45,
        220,
        206,
        32,
        174,
        239
      ],
      "accounts": [
        {
          "name": "funder",
          "writable": true,
          "signer": true
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initializeHouse",
      "docs": [
        "One-time setup. Creates the `House` config and the pooled `Vault`."
      ],
      "discriminator": [
        180,
        46,
        86,
        125,
        135,
        107,
        214,
        28
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "house",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  104,
                  111,
                  117,
                  115,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "edgeBps",
          "type": "u16"
        },
        {
          "name": "minBet",
          "type": "u64"
        },
        {
          "name": "maxBet",
          "type": "u64"
        }
      ]
    },
    {
      "name": "placeBet",
      "docs": [
        "Place a coin-flip bet. Escrows the stake from the player's balance,",
        "records the bet, and requests fresh randomness from ORAO VRF via CPI.",
        "The outcome is NOT known in this transaction."
      ],
      "discriminator": [
        222,
        62,
        67,
        220,
        63,
        166,
        126,
        33
      ],
      "accounts": [
        {
          "name": "player",
          "writable": true,
          "signer": true
        },
        {
          "name": "house",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  104,
                  111,
                  117,
                  115,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "playerAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  121,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "player"
              }
            ]
          }
        },
        {
          "name": "bet",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "player"
              },
              {
                "kind": "arg",
                "path": "force"
              }
            ]
          }
        },
        {
          "name": "random",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  114,
                  97,
                  111,
                  45,
                  118,
                  114,
                  102,
                  45,
                  114,
                  97,
                  110,
                  100,
                  111,
                  109,
                  110,
                  101,
                  115,
                  115,
                  45,
                  114,
                  101,
                  113,
                  117,
                  101,
                  115,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "force"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                7,
                71,
                177,
                26,
                250,
                145,
                180,
                209,
                249,
                34,
                242,
                123,
                14,
                186,
                193,
                218,
                178,
                59,
                33,
                41,
                164,
                190,
                243,
                79,
                50,
                164,
                123,
                88,
                245,
                206,
                252,
                120
              ]
            }
          }
        },
        {
          "name": "treasury",
          "writable": true
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  114,
                  97,
                  111,
                  45,
                  118,
                  114,
                  102,
                  45,
                  110,
                  101,
                  116,
                  119,
                  111,
                  114,
                  107,
                  45,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103,
                  117,
                  114,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                7,
                71,
                177,
                26,
                250,
                145,
                180,
                209,
                249,
                34,
                242,
                123,
                14,
                186,
                193,
                218,
                178,
                59,
                33,
                41,
                164,
                190,
                243,
                79,
                50,
                164,
                123,
                88,
                245,
                206,
                252,
                120
              ]
            }
          }
        },
        {
          "name": "vrf",
          "address": "VRFzZoJdhFWL8rkvu87LpKM3RbcVezpMEc6X5GVDr7y"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "side",
          "type": "u8"
        },
        {
          "name": "force",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "setConfig",
      "docs": [
        "Authority-only config update (min/max bet, edge)."
      ],
      "discriminator": [
        108,
        158,
        154,
        175,
        212,
        98,
        52,
        66
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "house"
          ]
        },
        {
          "name": "house",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  104,
                  111,
                  117,
                  115,
                  101
                ]
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "edgeBps",
          "type": "u16"
        },
        {
          "name": "minBet",
          "type": "u64"
        },
        {
          "name": "maxBet",
          "type": "u64"
        }
      ]
    },
    {
      "name": "settleBet",
      "docs": [
        "Settle a pending bet once ORAO has fulfilled its randomness. Reads the",
        "VRF output, maps it to heads/tails, applies the payout, and closes the",
        "bet account (rent returned to the player)."
      ],
      "discriminator": [
        115,
        55,
        234,
        177,
        227,
        4,
        10,
        67
      ],
      "accounts": [
        {
          "name": "player",
          "writable": true,
          "signer": true,
          "relations": [
            "bet"
          ]
        },
        {
          "name": "house",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  104,
                  111,
                  117,
                  115,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "playerAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  121,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "player"
              }
            ]
          }
        },
        {
          "name": "bet",
          "writable": true
        },
        {
          "name": "random"
        }
      ],
      "args": []
    },
    {
      "name": "withdraw",
      "docs": [
        "Withdraw from the casino balance back to the wallet. Moves real lamports",
        "vault -> user via direct lamport debit (the vault is program-owned)."
      ],
      "discriminator": [
        183,
        18,
        70,
        156,
        148,
        109,
        161,
        34
      ],
      "accounts": [
        {
          "name": "player",
          "writable": true,
          "signer": true
        },
        {
          "name": "house",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  104,
                  111,
                  117,
                  115,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "playerAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  121,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "player"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "bet",
      "discriminator": [
        147,
        23,
        35,
        59,
        15,
        75,
        155,
        32
      ]
    },
    {
      "name": "house",
      "discriminator": [
        21,
        145,
        94,
        109,
        254,
        199,
        210,
        151
      ]
    },
    {
      "name": "networkState",
      "discriminator": [
        212,
        237,
        148,
        56,
        97,
        245,
        51,
        169
      ]
    },
    {
      "name": "player",
      "discriminator": [
        205,
        222,
        112,
        7,
        165,
        155,
        206,
        218
      ]
    },
    {
      "name": "vault",
      "discriminator": [
        211,
        8,
        232,
        43,
        2,
        152,
        117,
        119
      ]
    }
  ],
  "events": [
    {
      "name": "betPlaced",
      "discriminator": [
        88,
        88,
        145,
        226,
        126,
        206,
        32,
        0
      ]
    },
    {
      "name": "betSettled",
      "discriminator": [
        57,
        145,
        224,
        160,
        62,
        119,
        227,
        206
      ]
    },
    {
      "name": "deposited",
      "discriminator": [
        111,
        141,
        26,
        45,
        161,
        35,
        100,
        57
      ]
    },
    {
      "name": "withdrawn",
      "discriminator": [
        20,
        89,
        223,
        198,
        194,
        124,
        219,
        13
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "mathOverflow",
      "msg": "Math overflow"
    },
    {
      "code": 6001,
      "name": "zeroAmount",
      "msg": "Amount must be greater than zero"
    },
    {
      "code": 6002,
      "name": "betTooSmall",
      "msg": "Bet is below the configured minimum"
    },
    {
      "code": 6003,
      "name": "betTooLarge",
      "msg": "Bet is above the configured maximum"
    },
    {
      "code": 6004,
      "name": "insufficientBalance",
      "msg": "Insufficient casino balance — deposit more first"
    },
    {
      "code": 6005,
      "name": "edgeTooHigh",
      "msg": "House edge exceeds the allowed maximum"
    },
    {
      "code": 6006,
      "name": "invalidSide",
      "msg": "Coin side must be 0 (heads) or 1 (tails)"
    },
    {
      "code": 6007,
      "name": "zeroForce",
      "msg": "The force seed must be non-zero (ORAO VRF requirement)"
    },
    {
      "code": 6008,
      "name": "insufficientHouseBankroll",
      "msg": "House bankroll cannot currently cover this bet's potential payout"
    },
    {
      "code": 6009,
      "name": "vaultInsolvent",
      "msg": "Vault would drop below its rent-exempt + reserved minimum"
    },
    {
      "code": 6010,
      "name": "randomnessNotFulfilled",
      "msg": "Randomness has not been fulfilled by the ORAO oracle yet"
    },
    {
      "code": 6011,
      "name": "betAlreadySettled",
      "msg": "This bet has already been settled"
    },
    {
      "code": 6012,
      "name": "unauthorized",
      "msg": "Only the house authority may perform this action"
    }
  ],
  "types": [
    {
      "name": "bet",
      "docs": [
        "One bet. PDA: [b\"bet\", user, &force]. Created at `place_bet`, closed at",
        "`settle_bet` (rent returned to the player). The `place_bet` / `settle_bet`",
        "transactions and the ORAO randomness account remain on-chain forever, so the",
        "bet is fully verifiable even after this account is closed."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "player",
            "type": "pubkey"
          },
          {
            "name": "nonce",
            "type": "u64"
          },
          {
            "name": "amount",
            "docs": [
              "Stake, in lamports."
            ],
            "type": "u64"
          },
          {
            "name": "side",
            "docs": [
              "Chosen side: 0 = heads, 1 = tails."
            ],
            "type": "u8"
          },
          {
            "name": "force",
            "docs": [
              "32-byte VRF seed; also the seed of the ORAO randomness account."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "potentialPayout",
            "docs": [
              "Full potential payout locked for this bet (stake * win-multiplier)."
            ],
            "type": "u64"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "betStatus"
              }
            }
          },
          {
            "name": "slotPlaced",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "betPlaced",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "player",
            "type": "pubkey"
          },
          {
            "name": "nonce",
            "type": "u64"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "side",
            "type": "u8"
          },
          {
            "name": "potentialPayout",
            "type": "u64"
          },
          {
            "name": "force",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "betSettled",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "player",
            "type": "pubkey"
          },
          {
            "name": "nonce",
            "type": "u64"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "side",
            "type": "u8"
          },
          {
            "name": "resultSide",
            "type": "u8"
          },
          {
            "name": "randomValue",
            "type": "u64"
          },
          {
            "name": "won",
            "type": "bool"
          },
          {
            "name": "payout",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "betStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "pending"
          },
          {
            "name": "won"
          },
          {
            "name": "lost"
          }
        ]
      }
    },
    {
      "name": "deposited",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "player",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "newBalance",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "house",
      "docs": [
        "Global casino configuration + accounting. One per program. PDA: [b\"house\"].",
        "",
        "Solvency invariant (checked on every state-changing instruction):",
        "vault.lamports >= vault_rent_exempt + total_liabilities + locked",
        "",
        "- `total_liabilities` = sum of every player's withdrawable balance.",
        "- `locked`            = sum, over all *pending* bets, of the full potential",
        "payout. Locking the max payout at bet time is what",
        "guarantees the house can always pay a winner."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "vaultBump",
            "type": "u8"
          },
          {
            "name": "edgeBps",
            "docs": [
              "House edge in basis points (e.g. 200 = 2%)."
            ],
            "type": "u16"
          },
          {
            "name": "minBet",
            "type": "u64"
          },
          {
            "name": "maxBet",
            "type": "u64"
          },
          {
            "name": "totalLiabilities",
            "docs": [
              "Sum of all players' withdrawable balances."
            ],
            "type": "u64"
          },
          {
            "name": "locked",
            "docs": [
              "Sum of potential payouts locked by currently-pending bets."
            ],
            "type": "u64"
          },
          {
            "name": "totalBets",
            "type": "u64"
          },
          {
            "name": "totalSettled",
            "type": "u64"
          },
          {
            "name": "totalWagered",
            "type": "u64"
          },
          {
            "name": "totalPaidOut",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "networkConfiguration",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "treasury",
            "type": "pubkey"
          },
          {
            "name": "requestFee",
            "type": "u64"
          },
          {
            "name": "fulfillmentAuthorities",
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "tokenFeeConfig",
            "type": {
              "option": {
                "defined": {
                  "name": "oraoTokenFeeConfig"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "networkState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "config",
            "type": {
              "defined": {
                "name": "networkConfiguration"
              }
            }
          },
          {
            "name": "numReceived",
            "docs": [
              "Total number of received requests."
            ],
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "oraoTokenFeeConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "docs": [
              "ORAO token mint address."
            ],
            "type": "pubkey"
          },
          {
            "name": "treasury",
            "docs": [
              "ORAO token treasury account."
            ],
            "type": "pubkey"
          },
          {
            "name": "fee",
            "docs": [
              "Fee in ORAO SPL token smallest units."
            ],
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "player",
      "docs": [
        "Per-user ledger. PDA: [b\"player\", user]. `balance` is the user's withdrawable",
        "claim on the vault; `nonce` is a monotonically increasing bet counter."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "balance",
            "type": "u64"
          },
          {
            "name": "nonce",
            "type": "u64"
          },
          {
            "name": "totalBets",
            "type": "u64"
          },
          {
            "name": "wins",
            "type": "u64"
          },
          {
            "name": "losses",
            "type": "u64"
          },
          {
            "name": "totalWagered",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "vault",
      "docs": [
        "Holds all pooled lamports. PDA: [b\"vault\"]. Program-owned so the program can",
        "pay winners by direct lamport manipulation; funded by deposits + house seed."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "withdrawn",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "player",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "newBalance",
            "type": "u64"
          }
        ]
      }
    }
  ],
  "constants": [
    {
      "name": "betSeed",
      "type": "bytes",
      "value": "[98, 101, 116]"
    },
    {
      "name": "houseSeed",
      "docs": [
        "PDA seeds."
      ],
      "type": "bytes",
      "value": "[104, 111, 117, 115, 101]"
    },
    {
      "name": "playerSeed",
      "type": "bytes",
      "value": "[112, 108, 97, 121, 101, 114]"
    },
    {
      "name": "vaultSeed",
      "type": "bytes",
      "value": "[118, 97, 117, 108, 116]"
    }
  ]
};
