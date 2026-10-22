import { business } from "../shared/content";

/** Address and map publication are deliberately gated on documentary review. */
export function BusinessDetails() {
  return (
    <div className="business-details">
      <p className="footer-identity">{business.name}</p>
      <dl>
        <div>
          <dt>Business phone</dt>
          <dd>
            <a href={`tel:${business.phone}`}>{business.phone}</a>
          </dd>
        </div>
        <div>
          <dt>General inquiries</dt>
          <dd>
            <a href={`mailto:${business.email}`}>{business.email}</a>
          </dd>
        </div>
        <div>
          <dt>Customer support</dt>
          <dd>
            <a href={`mailto:${business.supportEmail}`}>
              {business.supportEmail}
            </a>
          </dd>
        </div>
        <div>
          <dt>Business address</dt>
          <dd>
            {business.addressVerified ? (
              <>
                <address>{business.address}</address>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on Google Maps (opens in a new tab)
                </a>
              </>
            ) : (
              "Karachi, Pakistan. Full address and map publication are pending registration and address-proof verification."
            )}
          </dd>
        </div>
      </dl>
    </div>
  );
}
