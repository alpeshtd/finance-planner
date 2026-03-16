/**
 * Sums all transactions for a specific category.
 * (In Step 1, we only look at the category itself. 
 * We will add recursive child summing in Step 2.)
 */
export const calculateTotalSpent = (categoryId, transactions) => {
  return transactions
    .filter(tx => Number(tx.category_id) === Number(categoryId))
    .reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0);
};

/**
 * Calculates the Rupee goal for a Root Category.
 */
export const calculateRootGoal = (percentage, monthlyIncome) => {
  return parseFloat(percentage || 0) * monthlyIncome;
};