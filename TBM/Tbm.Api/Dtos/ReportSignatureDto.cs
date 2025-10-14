
namespace Tbm.Api.Dtos
{
    public class ReportSignatureDto
    {
        public int UserId { get; set; }
        public string? SignatureImage { get; set; } // Base64 encoded image
    }
}
