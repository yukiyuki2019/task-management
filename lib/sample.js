function onButtonClick() {
  const checkbox1 = document.getElementById('Checkbox1');
  const checkbox2 = document.getElementById('Checkbox2');

  if (checkbox1.checked == true && checkbox2.checked == true) {
    console.log('緊急&重要');
  } else if (checkbox1.checked == true) {
    console.log('緊急');
  } else if (checkbox2.checked == true) {
    console.log('重要');
  } else {
    console.log('その他');
  }
}