/**
 * User avatar/menu component.
 * Uses Dynamic's DynamicUserProfile for account management.
 */

import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { DynamicWidget } from '@dynamic-labs/sdk-react-core';

export function UserButton() {
  const { user } = useDynamicContext();

  if (!user) return null;

  return <DynamicWidget />;
}

export default UserButton;
