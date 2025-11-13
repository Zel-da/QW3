# Read the file
$content = Get-Content -Path "server/routes.ts" -Raw

# Define the old code block
$oldCode = @"
      // Update approval request with signature and approval
      const updatedRequest = await prisma.approvalRequest.update({
        where: { id: req.params.approvalId },
        data: {
          status: "APPROVED",
          approvedAt: new Date(),
          executiveSignature: signature
        }
      });

      // Update monthly approval status
      await prisma.monthlyApproval.update({
        where: { id: approvalRequest.reportId },
        data: {
          status: "APPROVED",
          approvedAt: new Date(),
          approverId: approvalRequest.approverId
        }
      });
"@

# Define the new code block
$newCode = @"
      // Update approval request and monthly approval in a transaction
      const approvedAt = new Date();

      const updatedRequest = await prisma.`$transaction(async (tx) => {
        // 1. Update approval request with signature and approval
        const approvalUpdate = await tx.approvalRequest.update({
          where: { id: req.params.approvalId },
          data: {
            status: "APPROVED",
            approvedAt,
            executiveSignature: signature
          }
        });

        // 2. Update monthly approval status
        const monthlyUpdate = await tx.monthlyApproval.update({
          where: { id: approvalRequest.reportId },
          data: {
            status: "APPROVED",
            approvedAt,
            approverId: approvalRequest.approverId
          }
        });

        console.log(`✅ 결재 승인 완료 - ApprovalRequest: ${approvalUpdate.id}, MonthlyApproval: ${monthlyUpdate.id}`);

        return approvalUpdate;
      });
"@

# Replace the code
$newContent = $content -replace [regex]::Escape($oldCode), $newCode

# Write back
Set-Content -Path "server/routes.ts" -Value $newContent

Write-Host "✅ Patch applied successfully!"
