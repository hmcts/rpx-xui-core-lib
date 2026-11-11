// The legacy function sorts the supplied array in place and returns it.
export const sortArray = (array: string[]): string[] => array.sort((left, right) => {
  const leftString = `${left}`;
  const rightString = `${right}`;
  return leftString < rightString ? -1 : leftString > rightString ? 1 : 0;
});
