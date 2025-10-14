namespace Tbm.Api.Dtos
{
    public class TemplateItemDto
    {
        public int ItemID { get; set; }
        public string Category { get; set; } = string.Empty;
        public string SubCategory { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public int DisplayOrder { get; set; }
    }
}
