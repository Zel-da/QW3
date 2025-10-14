
using System;
using System.Collections.Generic;

namespace Tbm.Api.Dtos
{
    public class ReportSubmissionDto
    {
        public DateTime ReportDate { get; set; }
        public int TeamId { get; set; }
        public string? ManagerName { get; set; }
        public Dictionary<int, string>? Results { get; set; } // ItemID, CheckState
        public string? Remarks { get; set; }
        public List<ReportSignatureDto>? Signatures { get; set; }
    }
}
