type Handler = () => boolean;

const stack: Handler[] = [];

export function pushBackHandler(fn: Handler) {
  stack.push(fn);
  return () => {
    const i = stack.indexOf(fn);
    if (i > -1) stack.splice(i, 1);
  };
}

export function popBackHandler(): boolean {
  const fn = stack[stack.length - 1];
  return fn ? fn() : false;
}
