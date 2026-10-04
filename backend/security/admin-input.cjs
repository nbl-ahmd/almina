const { fail } = require("./boundary.cjs");
function productInput(body, creating = false) {
  const required = creating
    ? ["name", "price", "stock", "barcode", "category"]
    : [];
  if (!body || required.some((key) => body[key] === undefined))
    throw fail(400, "INVALID_REQUEST");
  for (const key of ["price", "salePrice", "stock", "expectedStock"])
    if (body[key] !== undefined) {
      if (
        !["string", "number"].includes(typeof body[key]) ||
        (typeof body[key] === "string" && !body[key].trim())
      )
        throw fail(400, "INVALID_REQUEST");
      const value = Number(body[key]);
      if (
        body[key] === "" ||
        !Number.isFinite(value) ||
        value < 0 ||
        (!["price", "salePrice"].includes(key) && !Number.isSafeInteger(value)) ||
        (["price", "salePrice"].includes(key) && (!/^\d+(?:\.\d{1,2})?$/.test(String(body[key])) || value > Number.MAX_SAFE_INTEGER / 100))
      )
        throw fail(400, "INVALID_REQUEST");
    }
  if ((body.sale === true || body.sale === 'true') && body.salePrice === undefined) throw fail(400, 'INVALID_REQUEST');
  if (body.salePrice !== undefined && body.price !== undefined && Number(body.salePrice) > Number(body.price)) throw fail(400, 'INVALID_REQUEST');
  if (!creating && body.stock !== undefined && body.expectedStock === undefined)
    throw fail(400, "INVALID_REQUEST");
  for (const [key, max] of [
    ["name", 500],
    ["barcode", 500],
    ["description", 4000],
  ])
    if (
      body[key] !== undefined &&
      (typeof body[key] !== "string" ||
        body[key].length > max ||
        (key !== "description" && !body[key].trim()))
    )
      throw fail(400, "INVALID_REQUEST");
  if (body.category !== undefined && !/^[a-f0-9]{24}$/i.test(body.category))
    throw fail(400, "INVALID_REQUEST");
}
function messageInput(body, template = false) {
  const keys = template
    ? ["recipient", "template", "link"]
    : ["recipient", "name", "text"];
  if (
    !body ||
    Object.keys(body).some((key) => !keys.includes(key)) ||
    !keys.every((key) => typeof body[key] === "string") ||
    !/^\+?[0-9]{1,20}$/.test(body.recipient)
  )
    throw fail(400, "INVALID_REQUEST");
  if (template) {
    let url;
    try {
      url = new URL(body.link);
    } catch {
      throw fail(400, "INVALID_REQUEST");
    }
    if (
      !/^[a-z0-9_]{1,100}$/.test(body.template) ||
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      body.link.length > 2048
    )
      throw fail(400, "INVALID_REQUEST");
  } else if (
    !body.text.trim() ||
    body.text.length > 4000 ||
    body.name.length > 100
  )
    throw fail(400, "INVALID_REQUEST");
}
module.exports = { productInput, messageInput };
