#pragma strict
#pragma downcast
/// <summary>
/// Example script that instantiates a HUD window that will follow this game object.
/// </summary>

public var prefab : GameObject;
public var target : Transform;
public var targetUnit : Unit;

function Start ()
{
   if (prefab != null)
   {
      var cam : UICamera = UICamera.FindCameraForLayer(prefab.layer);
      if (cam != null)
      {
         var go : GameObject = cam.gameObject;
         var anchor : UIAnchor = go.GetComponent(UIAnchor);
         if (anchor != null) go = anchor.gameObject;
   
         var child : GameObject = GameObject.Instantiate(prefab) as GameObject;
         var t : Transform = child.transform;
         t.parent = go.transform;
         t.localPosition = Vector3.zero;
         t.localRotation = Quaternion.identity;
         t.localScale = Vector3.one;
   
         var hud : UnitHUD = child.GetComponent(UnitHUD);
         if (hud != null)  hud.target = (target != null) ? target : transform;
         if (targetUnit) targetUnit.AttachHUD(child.transform);
      }
      else
      {
         Debug.LogWarning("No camera found for layer " + LayerMask.LayerToName(prefab.layer), gameObject);
      }
   }
   Destroy(this);
}
