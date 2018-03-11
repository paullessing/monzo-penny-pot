import { Pot, Account } from './models';

export interface Args {
  userId: string;
  accessToken: string;
  accounts: Account[];
  pots: Pot[];
}

export default ({ accounts, accessToken, userId, pots }: Args) => `
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<title>Select your account and pot</title>
</head>

<body>
<form action="setup" method="post">
  <input type="hidden" name="accessToken" value="${accessToken}">
  <input type="hidden" name="userId" value="${userId}">
  <h1>Confirm your details</h1>
  ${accounts.length > 1 ? `
  <div>
    <label>Account
      <select name="accountId" required>${ accounts.map(account => `<option value="${account.id}">${account.description}</option>`) }</select>
    </label>
  </div>` : `<input type="hidden" name="accountId" value="${accounts[0].id}"` }
  <div>
    <label>Pot
      <select name="potId" required>${ pots.map(pot => `<option value="${pot.id}">${pot.name}</option>`) }</select>
    </label>
  </div>
  
  <button type="submit">Submit</button>
</form>
</body>
</html>
`;
