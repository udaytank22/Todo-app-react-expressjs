const hexStr = "7b226d223a22341414d6b414749334f575a6d5a5451794c5449325a544934526d526d426930355a546c694c346e69596a5130596a637a4e6a5a";
try {
  const text = Buffer.from(hexStr, 'hex').toString('utf8');
  console.log('Decoded text:', text);
} catch (e) {
  console.error(e);
}
