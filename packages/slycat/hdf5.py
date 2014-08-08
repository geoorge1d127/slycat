import h5py
import numpy
import os
import slycat.darray

class DArray(slycat.darray.Prototype):
  """Slycat darray implementation that stores data in an HDF5 file."""
  def __init__(self, storage):
    self._storage = storage
    self._metadata = self._storage.get("metadata", None)
    if self._metadata is None:
      self._metadata = self._storage.attrs

  @property
  def ndim(self):
    return len(self._metadata["dimension-names"])

  @property
  def shape(self):
    return tuple([end - begin for begin, end in zip(self._metadata["dimension-begin"], self._metadata["dimension-end"])])

  @property
  def size(self):
    return numpy.prod(self.shape)

  @property
  def dimensions(self):
    return [dict(name=name, type=type, begin=begin, end=end) for name, type, begin, end in zip(self._metadata["dimension-names"], self._metadata["dimension-types"], self._metadata["dimension-begin"], self._metadata["dimension-end"])]

  @property
  def attributes(self):
    return [dict(name=name, type=type) for name, type in zip(self._metadata["attribute-names"], self._metadata["attribute-types"])]

  @property
  def statistics(self):
    attributes = [self._storage["attribute/%s" % attribute].attrs for attribute in range(len(self._metadata["attribute-names"]))]
    return [dict(min=attribute.get("min", None), max=attribute.get("max", None)) for attribute in attributes]

  def get(self, attribute=0):
    return self._storage["attribute/%s" % attribute]

  def set(self, attribute, hyperslice, data):
    if not (0 <= attribute and attribute < len(self.attributes)):
      raise ValueError("Attribute index %s out-of-range." % attribute)
    if isinstance(hyperslice, slice):
      pass
    elif isinstance(hyperslice, tuple):
      for i in hyperslice:
        if not isinstance(i, slice):
          raise ValueError("Hyperslice must be a slice object or tuple of slice objects.")
    else:
      raise ValueError("Hyperslice must be a slice object or tuple of slice objects.")
    # Store the data ...
    attribute = self._storage["attribute/%s" % attribute]
    attribute[hyperslice] = data

    # Update attribute min/max statistics ...
    attribute_min = attribute.attrs.get("min", None)
    attribute_max = attribute.attrs.get("max", None)
    if data.dtype.char in ["O", "S", "U"]:
      data_min = min(data)
      data_max = max(data)
      attribute_min = str(data_min) if attribute_min is None else str(min(data_min, attribute_min))
      attribute_max = str(data_max) if attribute_max is None else str(max(data_max, attribute_max))
    else:
      data = data[numpy.invert(numpy.isnan(data))]
      if len(data):
        data_min = numpy.asscalar(data.min())
        data_max = numpy.asscalar(data.max())
        attribute_min = data_min if attribute_min is None else min(data_min, attribute_min)
        attribute_max = data_max if attribute_max is None else max(data_max, attribute_max)

    if attribute_min is not None:
      attribute.attrs["min"] = attribute_min
    if attribute_max is not None:
      attribute.attrs["max"] = attribute_max

class ArraySet(object):
  """Wraps an instance of :class:`h5py.File` to implement a Slycat arrayset."""
  def __init__(self, file):
    self._storage = file

  def __len__(self):
    return len(self._storage["array"])

  def __getitem__(self, key):
    return DArray(self._storage["array/%s" % key])

  def keys(self):
    return [int(key) for key in self._storage["array"].keys()]

  def start_array(self, array_index, dimensions, attributes):
    """Add an uninitialized darray to the arrayset.

    An existing array with the same index will be overwritten.

    Parameters
    ----------
    array_index : integer
      Zero-based index of the array to create.
    dimensions : list of dicts
      Description of the new array dimensions.
    attributes : list of dicts
      Description of the new array attributes.

    Returns
    -------
    array : :class:`slycat.hdf5.DArray`
    """
    stub = slycat.darray.Stub(dimensions, attributes)
    shape = [dimension["end"] - dimension["begin"] for dimension in stub.dimensions]
    stored_types = [dtype(attribute["type"]) for attribute in stub.attributes]

    # Allocate space for the coming data ...
    array_key = "array/%s" % array_index
    if array_key in self._storage:
      del self._storage[array_key]
    for attribute_index, stored_type in enumerate(stored_types):
      self._storage.create_dataset("array/%s/attribute/%s" % (array_index, attribute_index), shape, dtype=stored_type)

    # Store array metadata ...
    array_metadata = self._storage[array_key].create_group("metadata")
    array_metadata["attribute-names"] = numpy.array([attribute["name"] for attribute in stub.attributes], dtype=h5py.special_dtype(vlen=unicode))
    array_metadata["attribute-types"] = numpy.array([attribute["type"] for attribute in stub.attributes], dtype=h5py.special_dtype(vlen=unicode))
    array_metadata["dimension-names"] = numpy.array([dimension["name"] for dimension in stub.dimensions], dtype=h5py.special_dtype(vlen=unicode))
    array_metadata["dimension-types"] = numpy.array([dimension["type"] for dimension in stub.dimensions], dtype=h5py.special_dtype(vlen=unicode))
    array_metadata["dimension-begin"] = numpy.array([dimension["begin"] for dimension in stub.dimensions], dtype="int64")
    array_metadata["dimension-end"] = numpy.array([dimension["end"] for dimension in stub.dimensions], dtype="int64")

    return DArray(self._storage[array_key])

  def store_array(self, array_index, array):
    """Store a :class:`slycat.darray.Prototype` in the arrayset.

    An existing array with the same index will be overwritten.

    Parameters
    ----------
    array_index : integer
      The index of the array to be created / overwritten.
    array : :class:`slycat.darray.Prototype`
      Existing darray to be stored.

    Returns
    -------
    array : :class:`slycat.hdf5.DArray`
    """
    if not isinstance(array, slycat.darray.Prototype):
      raise ValueError("A slycat.darray is required.")

    index = tuple([slice(dimension["begin"], dimension["end"]) for dimension in array.dimensions])

    self.start_array(array_index, array.dimensions, array.attributes)
    for attribute_index, attribute in enumerate(array.attributes):
      stored_type = dtype(attribute["type"])
      data = array.get(attribute_index)
      statistics = array.statistics[attribute_index]

      # Store the data ...
      attribute_key = "array/%s/attribute/%s" % (array_index, attribute_index)
      hdf5_attribute = self._storage[attribute_key]
      hdf5_attribute[index] = data
      hdf5_attribute.attrs["min"] = statistics["min"]
      hdf5_attribute.attrs["max"] = statistics["max"]

    return DArray(self._storage["array/%s" % array_index])

def start_arrayset(file):
  """Create a new array set."""
  if not isinstance(file, h5py.File):
    raise ValueError("An open h5py.File is required.")
  file.create_group("array")
  return ArraySet(file)

###############################################################################################################################################3
# Legacy functionality - don't use these in new code.

def dtype(type):
  """Convert a string attribute type into a dtype suitable for use with h5py."""
  if type not in dtype.type_map.keys():
    raise Exception("Unsupported type: {}".format(type))
  return dtype.type_map[type]
dtype.type_map = {"int8":"int8", "int16":"int16", "int32":"int32", "int64":"int64", "uint8":"uint8", "uint16":"uint16", "uint32":"uint32", "uint64":"uint64", "float32":"float32", "float64":"float64", "string":h5py.special_dtype(vlen=unicode), "float":"float32", "double":"float64"}

def path(array, directory):
  return os.path.join(directory, array[0:2], array[2:4], array[4:6], array + ".hdf5")

