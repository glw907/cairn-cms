import { greeting } from '$lib/greeting';

export const load = ({ platform }) => ({ greeting, db: platform?.env.AUTH_DB });
