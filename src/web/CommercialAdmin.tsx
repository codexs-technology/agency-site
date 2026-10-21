import { useEffect, useState } from "react";
import { request } from "./forms";

type Row = Record<string, unknown>;
export function CommercialAdmin({
  entity,
  csrf,
}: {
  entity: string;
  csrf: string;
}) {
  const [rows, setRows] = useState<Row[]>([]),
    [editor, setEditor] = useState(""),
    [id, setId] = useState(""),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [page, setPage] = useState(1),
    [total, setTotal] = useState(0),
    [search, setSearch] = useState(""),
    [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    request(
      `/api/admin/commerce/${entity}?page=${page}&search=${encodeURIComponent(search)}`,
      undefined,
      "GET",
    )
      .then((data) => {
        if (active) {
          setRows(data.items as Row[]);
          setTotal(Number(data.total));
        }
      })
      .catch((err) => {
        if (active) setError((err as Error).message);
      });
    return () => {
      active = false;
    };
  }, [entity, page, search, version]);
  return (
    <section>
      <h2>{entity}</h2>
      {entity === "compliance" && (
        <p>
          Incomplete items are launch blockers. Mark verified only with genuine
          supporting evidence. Merchant approval remains the provider’s
          decision.
        </p>
      )}
      {entity === "orders" && (
        <p>
          Read-only order records. No payment provider is enabled; checkout,
          customer history, receipts, reconciliation and refunds are not
          operational.
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      <label className="field">
        Search
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </label>
      {entity === "testimonials" && (
        <button
          className="button"
          onClick={() => {
            setId("");
            setEditor(
              JSON.stringify(
                {
                  name: "",
                  role: "",
                  company: "",
                  review: "",
                  permission_reference: "",
                  verified: 0,
                  status: "draft",
                },
                null,
                2,
              ),
            );
          }}
        >
          Create testimonial
        </button>
      )}
      {editor && (
        <form
          className="form-panel"
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            setMessage("");
            try {
              const body = JSON.parse(editor);
              await request(
                `/api/admin/commerce/${entity}${id ? `/${id}` : ""}`,
                body,
                id ? "PUT" : "POST",
                csrf,
              );
              setEditor("");
              setMessage("Saved to D1.");
              setVersion((v) => v + 1);
            } catch (err) {
              setError((err as Error).message);
            }
          }}
        >
          <label className="field">
            Validated record JSON
            <textarea
              rows={20}
              value={editor}
              onChange={(e) => setEditor(e.target.value)}
              required
            />
          </label>
          <div className="button-row">
            <button className="button">Save record</button>
            <button
              type="button"
              className="button button-secondary"
              onClick={() => setEditor("")}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <caption>
            Page {page} · {total} records
          </caption>
          <thead>
            <tr>
              <th>Record</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={String(row.id)}>
                <td>
                  {String(row.title || row.name || row.customer_email)}
                  <details>
                    <summary>Stored details</summary>
                    <pre>{JSON.stringify(row, null, 2)}</pre>
                  </details>
                </td>
                <td>{String(row.status)}</td>
                <td>
                  {entity !== "orders" && (
                    <button
                      className="button button-secondary"
                      onClick={() => {
                        const editable = { ...row };
                        delete editable.id;
                        delete editable.created_at;
                        delete editable.updated_at;
                        setId(String(row.id));
                        setEditor(JSON.stringify(editable, null, 2));
                      }}
                    >
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="button-row">
        <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
          Previous
        </button>
        <button
          disabled={page * 20 >= total}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>
    </section>
  );
}
