UPDATE users
SET
  password_hash = 'scrypt:ebb3c86565a214bb0825099169095108:f116fc2e57cd835d1d47022289c1663bdc096468eab4d6149639906218c04d94d6ff773b18a18b7b9c1ab48dbf8b6e9a21d921db368fa278b9435f06d99efbe9'
WHERE id = '6f56c71e-6d79-4b18-bf43-d42d15eb0b8c'
   OR email = 'oliver@emorya.com';

UPDATE users
SET
  password_hash = 'scrypt:d7e07bbf6effc2427264688c379aa587:06e824dab6967fa7cae5d82dc026f16254fc3bcb6d0b5afc758a5dd17e5c559a34ec5703c4d18c54370ae3ac5ffc18b17f45c1643f7133f2d5d6c455031c1281'
WHERE id = '2196480b-b0fc-4e15-8837-e1d02177c7ed'
   OR email = 'lina@emorya.com';
