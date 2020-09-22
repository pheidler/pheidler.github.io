// useful helper functions
function schemize_nums(max, times) {
  let nums = [];
  let step = max / times;
  for (let i = 0; i <= times; ++i) nums.push(i * step);
  //console.log(max, times, nums);
  return nums;
}

// https://stackoverflow.com/questions/1669190/find-the-min-max-element-of-an-array-in-javascript
function arrayMin(arr) {
  var len = arr.length, min = Infinity;
  while (len--) {
    if (arr[len] < min) {
      min = arr[len];
    }
  }
  return min;
};

function arrayMax(arr) {
  var len = arr.length, max = -Infinity;
  while (len--) {
    if (arr[len] > max) {
      max = arr[len];
    }
  }
  return max;
};