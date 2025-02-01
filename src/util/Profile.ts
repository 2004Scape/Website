// todo: move to db table
export const profiles = [
    { id: 'beta', name: 'Beta' },
    { id: 'alpha1', name: 'Alpha 1.0' },
    { id: 'alpha2', name: 'Alpha 2.0' },
    { id: 'alpha3', name: 'Alpha 3.0' },
];

export function resolveSelectedProfile(req: any): { id: string } {
    let profile = profiles.find((p) => p.id === req.query.profile);

    if (!profile && req.session.selectedProfile) {
        profile = profiles.find((p) => p.id === req.session.selectedProfile);
    }
    if (!profile) {
        profile = profiles[0];
    }
    req.session.selectedProfile = profile.id;

    return profile;
}
