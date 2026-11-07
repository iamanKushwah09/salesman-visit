/**
 * Role-Based Access Control (RBAC) Permission Middleware
 * Checks if the logged-in user's assigned role contains the required permission.
 * Super Admin or roles with '*' have global bypass.
 */
const checkPermission = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({
        success: false,
        message: 'Access Denied: No role assigned to your account',
      });
    }

    const role = req.user.role;
    const permissions = Array.isArray(role.permissions) ? role.permissions : [];

    // Super Admin bypass
    if (role.slug === 'super_admin' || permissions.includes('*') || permissions.includes('all')) {
      return next();
    }

    if (permissions.includes(requiredPermission)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Access Denied: Your role '${role.name}' does not have permission for '${requiredPermission}'`,
      requiredPermission,
    });
  };
};

module.exports = { checkPermission };

