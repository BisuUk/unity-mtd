#pragma strict

var attributes : UnitAttributes;
var unit : Unit;
private var isSelected : boolean;
private static var previewMaterial : Material = null;


function Awake()
{
   gameObject.SendMessage("SetDefaultBehaviorEnabled", false, SendMessageOptions.DontRequireReceiver);
   unit = gameObject.GetComponent(Unit);
   if (previewMaterial==null)
      previewMaterial = Resources.Load("gfx/Materials/shadedAlpha", Material);
   isSelected = false;
   gameObject.tag = "";
}

function Start()
{
   // Make alpha'd ghost effect
   unit.SetMaterial(previewMaterial);
}

function Update()
{
   var c : Color = attributes.color;
   // Pulsate color if selected, otherwise ghost

   if ((GUIControl.attackGUI.attackPanel.selectedUnitIndex == unit.ID) != isSelected)
   {
      isSelected = (GUIControl.attackGUI.attackPanel.selectedUnitIndex == unit.ID);
      unit.AOE.renderer.enabled = isSelected;
   }

   c.a = isSelected ? GUIControl.colorPulsateValue : 0.5;
   unit.SetColor(c);
}

function OnMouseDown()
{
   GUIControl.attackGUI.attackPanel.SetSelectedUnitIndex(unit.ID);
}

function OnMouseExit()
{
   // This hopefully overrides the Exit of UnitHealer, etc.
   unit.AOE.renderer.enabled = isSelected;
}
