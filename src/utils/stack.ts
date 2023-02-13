export class Stack<T> {
  private array: T[] = [];

  public push(value: T) {
    this.array.push(value);
  }

  public pop() {
    return this.array.pop();
  }

  public isEmpty() {
    return this.array.length === 0;
  }

  public peek() {
    return this.array[this.array.length - 1];
  }

  public size() {
    return this.array.length;
  }

  public get(ind: number) {
    return this.array[ind];
  }
}
