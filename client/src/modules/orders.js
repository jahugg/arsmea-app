export async function render() {
    const module = document.createElement("div");
    module.classList.add("module");
    module.id = "order";
    module.innerHTML = `Orders`;
  
    return module;
  }