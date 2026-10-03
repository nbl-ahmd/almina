import http from "node:http";
const port = Number(process.env.ADMIN_FIXTURE_PORT ?? 4600);
const admin = {
  id: "a".repeat(24),
  _id: "a".repeat(24),
  username: "synthetic-admin",
  name: "Synthetic Admin",
  role: "admin",
  cities: ["City A"],
};
const staff = {
  ...admin,
  id: "b".repeat(24),
  _id: "b".repeat(24),
  username: "synthetic-staff",
  name: "Synthetic Staff",
  role: "user",
};
const tokens = { ["a".repeat(43)]: admin, ["b".repeat(43)]: staff };
let orders = [
  {
    _id: "c".repeat(24),
    orderId: "1001",
    status: "pending",
    snapshotAvailable: true,
    createdAt: "2026-10-03T00:00:00Z",
    customer: {
      name: "Synthetic Customer",
      city: "City A",
      totalAmount: 40,
      totalSalePrice: 35,
      deliveryFee: 5,
      address: "Fixture street",
      mobile: "0501234567",
      email: "synthetic@example.invalid",
    },
    cartItems: [
      {
        _id: { name: "Synthetic item", price: 35 },
        quantity: 1,
        lineTotalMinor: 3500,
      },
    ],
  },
];
const product = {
  _id: "d".repeat(24),
  product_id: "PD5001",
  name: "Synthetic product",
  price: 35,
  stock: 5,
  barcode: "123",
  description: "Synthetic fixture",
  disabled: false,
  category: { _id: "e".repeat(24), name: "Synthetic category" },
};
let fail = false;
const commands = [];
http
  .createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    const path = url.pathname;
    let raw = "";
    for await (const chunk of req) raw += chunk;
    const send = (status, body) => {
      res.writeHead(status, {
        "content-type": "application/json",
        "cache-control": "no-store",
      });
      res.end(body === undefined ? undefined : JSON.stringify(body));
    };
    if (path === "/__fixture/health")
      return send(200, { fixture: "almina-admin-synthetic" });
    if (path === "/__fixture/reset") {
      fail = false;
      tokens["a".repeat(43)] = admin;
      tokens["b".repeat(43)] = staff;
      orders = orders.filter((order) => order.orderId === "1001");
      commands.length = 0;
      return send(200, {});
    }
    if (path === "/__fixture/commands") return send(200, commands);
    if (path === "/__fixture/failure") {
      fail = !fail;
      return send(200, { fail });
    }
    if (path === "/__fixture/new-order") {
      orders.unshift({ ...orders[0], _id: "f".repeat(24), orderId: "1002" });
      return send(200, {});
    }
    if (fail) return send(503, {});
    if (path === "/api/auth/login") {
      const input = JSON.parse(raw);
      const user =
        input.username === admin.username
          ? admin
          : input.username === staff.username
            ? staff
            : null;
      if (!user || input.password !== "synthetic-test-password")
        return send(401, {});
      res.setHeader(
        "Set-Cookie",
        `almina_session=${user.role === "admin" ? "a" : "b"}`.replace(
          /=(a|b)$/,
          (_, c) => "=" + c.repeat(43),
        ) + "; Path=/; HttpOnly; SameSite=Lax",
      );
      return send(200, user);
    }
    const user =
      tokens[/almina_session=([ab]{43})/.exec(req.headers.cookie ?? "")?.[1]];
    if (!user) return send(401, {});
    if (path === "/api/auth/me") return send(200, user);
    if (path.startsWith("/api/auth/logout")) {
      delete tokens[
        /almina_session=([ab]{43})/.exec(req.headers.cookie ?? "")?.[1]
      ];
      res.setHeader(
        "Set-Cookie",
        "almina_session=; Max-Age=0; Path=/; HttpOnly",
      );
      return send(204);
    }
    if (
      user.role !== "admin" &&
      !path.startsWith("/api/orders") &&
      !(req.method === "GET" && path.startsWith("/api/products"))
    )
      return send(403, {});
    if (req.method !== "GET") {
      commands.push({
        path,
        method: req.method,
        contentType: req.headers["content-type"],
        body:
          path === "/api/auth/signup"
            ? { redacted: true }
            : req.headers["content-type"]?.startsWith("application/json")
              ? JSON.parse(raw || "{}")
              : { multipart: true },
        csrf: req.headers["x-csrf-protection"],
        origin: req.headers.origin,
      });
      return send(200, {
        success: true,
        count: path === "/api/batch" ? 2 : undefined,
      });
    }
    if (path === "/api/orders") return send(200, orders);
    if (path.startsWith("/api/orders/"))
      return send(
        200,
        orders.find((order) => order._id === path.split("/").at(-1)) ??
          orders[0],
      );
    if (path === "/api/products" || path === "/api/products/search")
      return send(200, [product]);
    if (path.startsWith("/api/products/")) return send(200, product);
    if (path === "/api/category")
      return send(200, [
        {
          _id: "e".repeat(24),
          name: "Synthetic category",
          color: "0, 80, 60",
          disabled: false,
        },
      ]);
    if (path.startsWith("/api/category/"))
      return send(200, {
        _id: "e".repeat(24),
        name: "Synthetic category",
        color: "0, 80, 60",
      });
    if (path === "/api/banners" || path === "/api/whatsapp/image")
      return send(200, []);
    if (path === "/api/auth/users") return send(200, [admin, staff]);
    if (path === "/api/store/status") return send(200, { status: "open" });
    if (path === "/api/whatsapp/recipients")
      return send(200, [
        {
          _id: "1".repeat(24),
          name: "Synthetic Recipient",
          from: "971501234567",
          promotionStatus: "true",
        },
      ]);
    if (path.startsWith("/api/whatsapp/messages/"))
      return send(200, {
        name: "Synthetic Recipient",
        from: "971501234567",
        messages: [
          {
            sender: "user",
            content: "Synthetic message",
            timestamp: "2026-10-03",
          },
        ],
      });
    if (path === "/api/whatsapp/reports")
      return send(200, [
        {
          _id: "2".repeat(24),
          broadcast: [
            { recipient: "971501234567", messageStatus: "delivered" },
          ],
        },
      ]);
    send(404, {});
  })
  .listen(port, "127.0.0.1", () =>
    console.log(`Synthetic admin fixture listening on ${port}`),
  );
