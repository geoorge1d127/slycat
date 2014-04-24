# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import numpy
import scipy.linalg
import scipy.stats

def cca(X, Y, scale_inputs=True, force_positive=None, significant_digits=None):
  """Compute Canonical Correlation Analysis (CCA).

  Returns: x, y, x_loadings, y_loadings, r, wilks
  """

  # Validate our inputs ...
  if X.ndim != 2 or Y.ndim != 2:
    raise Exception("X and Y must have two dimensions.")
  if X.shape[0] != Y.shape[0]:
    raise Exception("X and Y must contain the same number of rows.")
  if X.shape[0] < 2:
    raise Exception("X and Y must contain two-or-more rows.")
  if force_positive is not None and (force_positive < 0 or force_positive >= Y.shape[1]):
    raise Exception("force_positive out-of-range.")

  eps = numpy.finfo("double").eps
  if significant_digits is None or significant_digits > numpy.abs(numpy.log10(eps)):
    significant_digits = numpy.abs(numpy.log10(eps))

  n = X.shape[0]
  p1 = X.shape[1]
  p2 = Y.shape[1]

  X -= X.mean(axis=0)
  Y -= Y.mean(axis=0)

  if scale_inputs:
    X /= X.std(axis=0)
    Y /= Y.std(axis=0)

  Q1, R1, P1 = scipy.linalg.qr(X, mode="economic", pivoting=True)
  Q2, R2, P2 = scipy.linalg.qr(Y, mode="economic", pivoting=True)

  Xrank = numpy.sum(numpy.abs(numpy.diag(R1)) > 10**(numpy.log10(numpy.abs(R1[0,0])) - significant_digits) * max(n, p1))
  Yrank = numpy.sum(numpy.abs(numpy.diag(R2)) > 10**(numpy.log10(numpy.abs(R2[0,0])) - significant_digits) * max(n, p2))

  if Xrank == 0:
    raise Exception("X must contain at least one non-constant column.")
  if Xrank < p1:
    Q1 = Q1[:,:Xrank]
    R1 = R1[:Xrank,:Xrank]
  if Yrank == 0:
    raise Exception("Y must contain at least one non-constant column.")
  if Yrank < p2:
    Q2 = Q2[:,:Yrank]
    R2 = R2[:Yrank,:Yrank]

  L, D, M = scipy.linalg.svd(numpy.dot(Q1.T, Q2), full_matrices=False)

  d = min(Xrank, Yrank)
  L = L[:,:d]
  M = M[:d,:]

  A = numpy.linalg.solve(R1, L)
  B = numpy.linalg.solve(R2, M.T)

  A *= numpy.sqrt(n - 1)
  B *= numpy.sqrt(n - 1)

  A = numpy.row_stack((A, numpy.zeros((p1 - Xrank, d))))
  B = numpy.row_stack((B, numpy.zeros((p2 - Yrank, d))))

  A[P1] = numpy.copy(A)
  B[P2] = numpy.copy(B)

  x = numpy.dot(X, A)
  y = numpy.dot(Y, B)

  x_loadings = numpy.array([[scipy.stats.pearsonr(i, j)[0] for j in X.T] for i in x.T]).T
  y_loadings = numpy.array([[scipy.stats.pearsonr(i, j)[0] for j in Y.T] for i in y.T]).T

  if force_positive is not None:
    for j in range(y_loadings.shape[1]):
      if y_loadings[force_positive, j] < 0:
        x_loadings[:,j] = -x_loadings[:,j]
        y_loadings[:,j] = -y_loadings[:,j]
        x[:,j] = -x[:,j]
        y[:,j] = -y[:,j]

  r = numpy.minimum(numpy.maximum(D[:d], 0), 1)

  nondegenerate = r < 1
  wilks = numpy.exp(numpy.cumsum(numpy.log(1-(r[nondegenerate] ** 2))[::-1])[::-1])

  return x, y, x_loadings, y_loadings, r, wilks
