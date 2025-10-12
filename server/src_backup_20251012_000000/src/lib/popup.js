// Simple popup for success/error feedback
export function showPopup(message, type = 'success') {
  const popup = document.createElement('div');
  popup.textContent = message;
  popup.style.position = 'fixed';
  popup.style.bottom = '30px';
  popup.style.right = '30px';
  popup.style.padding = '16px 24px';
  popup.style.background = type === 'success' ? '#4caf50' : '#f44336';
  popup.style.color = '#fff';
  popup.style.borderRadius = '8px';
  popup.style.zIndex = '9999';
  popup.style.fontSize = '16px';
  document.body.appendChild(popup);
  setTimeout(() => {
    popup.remove();
  }, 3000);
}
