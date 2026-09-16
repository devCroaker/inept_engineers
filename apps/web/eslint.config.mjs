import base from "@inept/config/eslint-react";

export default [...base, { ignores: [".next/**", "next-env.d.ts"] }];
