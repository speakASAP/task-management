// Mock for uuid package
let counter = 0;

const v4 = () => {
    counter++;
    return `mock-uuid-${counter}`;
};

module.exports = {
    v4,
    default: {
        v4
    }
};
