export const getErrorMessage = (error, defaultMessage = 'An unexpected error occurred.') => {
  return error.response?.data?.error || error.message || defaultMessage;
};
